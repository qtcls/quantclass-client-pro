/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import fs from "node:fs"
import path from "node:path"
import { setupAppLifecycle } from "@/main/app-lifecycle.js"
import { CONFIG } from "@/main/config.js"
import { setupErrorHandlers } from "@/main/error-handlers.js"
import { regAuthIPC } from "@/main/ipc/auth-ipc.js"
import { regCoreIPC } from "@/main/ipc/core-ipc.js"
import { regDataIPC } from "@/main/ipc/data-ipc.js"
import { regFileSysIPC } from "@/main/ipc/file-sys-ipc.js"
import { regKernelLogIPC } from "@/main/ipc/kernel-log-ipc.js"
import { regMigrationIPC } from "@/main/ipc/migration-ipc.js"
import { regNotificationIPC } from "@/main/ipc/notification-ipc.js"
import { regRealTradingBackupIPC } from "@/main/ipc/real-trading-backup-ipc.js"
import { regRepoIPC } from "@/main/ipc/repo-ipc.js"
import { regStartupCheckIPC } from "@/main/ipc/startup-check-ipc.js"
import { regStoreIPC } from "@/main/ipc/store-ipc.js"
import { regStrategyIPC } from "@/main/ipc/strategy-ipc.js"
import { regSystemIPC } from "@/main/ipc/system-ipc.js"
import { regUserIPC } from "@/main/ipc/user-ipc.js"
import { regWindowsIPC } from "@/main/ipc/windows-ipc.js"
import { default as windowManager } from "@/main/lib/WindowManager.js"
import { createWindow } from "@/main/lib/createWindow.js"
// import setupUpdater from "@/main/lib/updater.js"
import DBManager from "@/main/lib/db-manager.js"
import { resetMinDataRoundsRunningForToday } from "@/main/lib/min-data-rounds-startup.js"
import { refreshRealTradingBackupSchedule } from "@/main/lib/real-trading-backup.js"
import { setAutoTrading } from "@/main/lib/scheduler.js"
import { tokenStore } from "@/main/lib/tokenStore.js"
import { createTray } from "@/main/lib/tray.js"
import { runMigrations } from "@/main/migration/runner.js"
import server from "@/main/server/index.js"
import { cleanupDB } from "@/main/server/middleware/db.js"
import {
	cleanLockFiles,
	killAllKernalByName,
	startServerOnAvailablePort,
} from "@/main/utils/tools.js"
import logger from "@/main/utils/wiston.js"
import { DEFAULT_SERVER_PORT, SERVER_PORT_KEY } from "@/shared/constants.js"
import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import type { PowerStatus } from "@/shared/types/index.js"
import { is, platform } from "@electron-toolkit/utils"
import { type Tray, app, powerMonitor } from "electron"
import log from "electron-log/main.js"
import store from "./store/index.js"

// -- 初始化日志记录器
log.initialize()
// -- 配置日志记录文件名
log.transports.file.fileName = CONFIG.LOG_FILE_NAME
// -- 配置日志格式
log.transports.file.format = CONFIG.LOG_FORMAT
log.transports.file.resolvePathFn = () =>
	path.join(app.getPath("home"), "Quantclass", "logs")
// -- 创建用户范围的日志记录器
const userLog = log.scope("user")
// -- 记录用户范围的消息
userLog.info("用户范围的消息")

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true"

// -- 创建托盘对象（可能创建失败而为 undefined）
let tray: Tray | undefined

// -- 把主窗口带回前台（second-instance 与 macOS activate 共用的唯一恢复路径）
const restoreMainWindow = () => {
	const win = windowManager.getLiveWindow()
	if (!win) return

	if (win.isMinimized() || !win.isVisible()) {
		win.show()
		win.restore()
	}
	win.focus()
}

// -- 设置语言环境和字符编码
app.commandLine.appendSwitch("lang", "zh-CN")
app.commandLine.appendSwitch("charset", "UTF-8")
app.commandLine.appendSwitch("ignore-certificate-errors")

if (platform.isWindows) {
	// -- 禁用硬件加速
	app.commandLine.appendSwitch("no-sandbox")
	app.commandLine.appendSwitch("disable-gpu")
	app.commandLine.appendSwitch("disable-software-rasterizer")
	app.commandLine.appendSwitch("disable-gpu-compositing")
	app.commandLine.appendSwitch("disable-gpu-rasterization")
	app.commandLine.appendSwitch("disable-gpu-sandbox")
	app.disableHardwareAcceleration()
}

// -- 获取单例锁
const additionalData = { ETC_KEY: "etc" }
const gotTheLock = app.requestSingleInstanceLock(additionalData)

if (!gotTheLock) {
	cleanupDB()
	// -- 如果未获取到单例锁，则退出应用
	app.quit()
} else {
	// -- 监听第二个实例的事件
	app.on("second-instance", () => {
		restoreMainWindow()
	})

	// -- 应用准备就绪事件。唯一启动路径：勿再新增 app.whenReady() 等并行启动回调，
	// -- 并行回调会在本序列首个 await 后抢跑，读到未建的窗口与 tray
	app.on("ready", async () => {
		// -- 错误处理最先注册（无窗口依赖，事件回调内惰性取窗），覆盖后续全部启动步骤
		setupErrorHandlers()

		// -- 启动时从磁盘解密 refresh_token 到内存
		await tokenStore.init()

		// -- 先注册所有 IPC，避免渲染进程在窗口加载早期调用时未注册
		regAuthIPC()
		regCoreIPC()
		regStoreIPC()
		regSystemIPC()
		regFileSysIPC()
		regKernelLogIPC()
		regDataIPC()
		regStrategyIPC()
		regWindowsIPC()
		regUserIPC()
		regMigrationIPC()
		regNotificationIPC()
		regRealTradingBackupIPC()
		regRepoIPC()
		regStartupCheckIPC()

		// -- 执行数据迁移
		await runMigrations()

		// -- FuelBinStat：今日 min_data_rounds 行 is_running 置 0（异常退出后状态修复）
		await resetMinDataRoundsRunningForToday()

		// -- 初始化实盘备份定时任务
		refreshRealTradingBackupSchedule()

		// -- 内核回调服务无条件启动：首启（all_data_path 未设）也监听，server_port 自首日即真值；
		// -- DB 中间件按请求惰性初始化、路径未设时优雅降级，无启动期路径依赖。
		// -- 仅绑定 loopback 127.0.0.1（探测/绑定/第一方调用方三者一致）；server_port 在真实 listening 后写入。
		// -- 发布门槛：内核对 localhost 的解析行为仓库不可证，须在有内核的 Windows 实机
		// -- 逐内核手测 /heartbeat /notify /product-status 全通后方可发布。
		try {
			const port = await startServerOnAvailablePort(DEFAULT_SERVER_PORT, server)
			store.setValue(SERVER_PORT_KEY, port)
			log.info(`服务器在端口 ${port} 上启动`)
		} catch (error) {
			logger.error(`[main] 内核回调服务启动失败（继续启动）: ${error}`)
		}

		// -- 创建系统托盘：须先于窗口，createWindow 要把 tray 传给应用菜单；失败降级为无托盘
		try {
			tray = createTray()
		} catch (error) {
			logger.error(`[main] 托盘创建失败（降级继续）: ${error}`)
		}

		// -- 创建主窗口与终端窗口
		await createWindow(tray)
		try {
			windowManager.createChildWindow("terminal", { show: false })
		} catch (error) {
			logger.error(`[main] 终端窗口创建失败（降级继续）: ${error}`)
		}

		// -- 设置应用生命周期（依赖窗口与 tray，须在两者创建之后调用）
		setupAppLifecycle(tray)

		// -- 系统休眠/唤醒（macOS/Windows；Linux 不在行为面内）：此处一次性注册，勿挂回 activate 等会重复触发的事件。
		// -- Windows suspend 由 main 权威 fail-closed（setAutoTrading(false)：意图位在 enforce 首个同步
		// -- 步骤翻转，store 写/按 lock PID 强杀/有界确认可在唤醒后续跑完成）；renderer 链只承载数据调度
		// -- 暂停/恢复与 UI 同步。resume 仅通知 renderer，不自动恢复实盘。
		// -- macOS 维持既有 renderer 链路（非 Windows 的强杀路径未经审查，勿在 main 侧启用）。
		if (platform.isMacOS || platform.isWindows) {
			const sendPowerStatus = (status: PowerStatus) => {
				windowManager
					.getLiveWindow()
					?.webContents.send(IPC_CHANNELS.POWER_STATUS, status)
			}
			powerMonitor.on("suspend", () => {
				// -- 先启动 fail-closed 再通知 renderer：send 异常不得阻断安全动作；
				// -- 只启动不等待（等待强杀链完成会推迟 renderer 收到 suspend）
				if (platform.isWindows) {
					void setAutoTrading(false)
						.then((ack) =>
							logger.info(
								`[power] suspend fail-closed ack: ok=${ack.ok} rocketRunning=${ack.rocketRunning}`,
							),
						)
						.catch((error) =>
							logger.error(`[power] suspend fail-closed 失败: ${error}`),
						)
				}
				sendPowerStatus("suspend")
			})
			powerMonitor.on("resume", () => sendPowerStatus("resume"))
		}

		// -- 开发模式打开 devtools
		is.dev && windowManager.getWindow()?.webContents.openDevTools()

		// -- 初始化更新程序
		// Todo: 暂时只支持 Windows 自动更新；Mac 需要开发者账号代码签名
		// platform.isWindows && (await setupUpdater())
		// process.env.VITE_XBX_ENV === "development" &&
		// !platform.isWindows &&
		// (await setupUpdater())

		// -- 初始化自检
		cleanLockFiles()

		// -- 清理zip历史文件夹
		const zip_dir_path = await store.getAllDataPath(["zip"])
		if (zip_dir_path && fs.existsSync(zip_dir_path)) {
			try {
				fs.rmSync(zip_dir_path, { recursive: true, force: true })
				logger.info(`[main] 已删除zip历史文件夹: ${zip_dir_path}`)
			} catch (error) {
				logger.error(`[main] 删除zip历史文件夹失败: ${error}`)
			}
		}
	})

	// -- 当应用程序激活时（macOS dock）：仅恢复窗口，勿在此挂内核生命周期操作——
	// -- dock 激活不应中断运行中的内核；stale .py.lock 由 isKernalRunning 在每次启动前按需清理，
	// -- 退出兜底走 quit 阶段的 killAllKernalByName。
	app.on("activate", () => {
		restoreMainWindow()
	})

	// 在用户调用 app.quit() 或关闭所有窗口时触发
	app.on("before-quit", async (_) => {
		logger.info("[main] 应用即将退出，执行退出前的操作...")
		// 在这里添加你的清理或保存操作
		// 如果你需要阻止退出，可以调用 event.preventDefault();
	})

	// 当所有窗口关闭后，应用即将退出时触发
	app.on("will-quit", async (_) => {
		logger.info("[main] 应用正在退出，进行最终清理...")
		// 兜底kill一遍
		// 执行退出时的清理工作

		DBManager.getInstance().close()
	})

	// 当退出流程全部完成后触发
	app.on("quit", async (_, exitCode) => {
		// 在这里添加你的清理或保存操作
		await cleanLockFiles()
		await killAllKernalByName()
		logger.info(`应用已退出，退出码：${exitCode}`)
	})
}
