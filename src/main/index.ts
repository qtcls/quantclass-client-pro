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
import { default as windowManager } from "@/main/lib/WindowManager.js"
import { createWindow } from "@/main/lib/createWindow.js"
import { createTray } from "@/main/lib/tray.js"
// import setupUpdater from "@/main/lib/updater.js"
import server from "@/main/server/index.js"
import { cleanupDB } from "@/main/server/middleware/db.js"
import {
	cleanLockFiles,
	killAllKernalByForce,
	startServerOnAvailablePort,
} from "@/main/utils/tools.js"
import logger from "@/main/utils/wiston.js"
import { regCoreIPC } from "@/preload/core/core-ipc.js"
import { regDataIPC } from "@/preload/data/data-ipc.js"
import { regFileSysIPC } from "@/preload/file-sys/file-sys-ipc.js"
import { regStoreIPC } from "@/preload/store/store-ipc.js"
import { regSystemIPC } from "@/preload/system/system-ipc.js"
import { regWindowsIPC } from "@/preload/windows/windows-ipc.js"
import { is, platform } from "@electron-toolkit/utils"
import { type Tray, app, ipcMain, powerMonitor, shell } from "electron"
import log from "electron-log/main.js"
import { userStore } from "./lib/userStore.js"
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

// -- 创建托盘对象
let tray: Tray

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
	app.commandLine.appendSwitch("--no-sandbox")
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
		const win = windowManager.getWindowById()

		if (win) {
			if (win.isMinimized() || !win.isVisible()) {
				win.show()
				win.restore()
			}
			win.focus()
		}
	})

	// -- 应用准备就绪事件
	app.on("ready", async () => {
		// -- 先注册所有 IPC，避免渲染进程在窗口加载早期调用时未注册
		regCoreIPC()
		regStoreIPC()
		regSystemIPC()
		regFileSysIPC()
		regDataIPC()
		regWindowsIPC()

		// -- 创建主窗口与终端窗口
		await createWindow()
		windowManager.createChildWindow("terminal", { show: false })

		// -- 监听渲染进程请求打开外部链接
		ipcMain.on("open-url", (_event, url) => {
			shell.openExternal(url)
		})

		const all_data_path = await store.getSetting("all_data_path", "")
		if (!all_data_path) {
			ipcMain.handle("start-server", async () => {
				const port = await startServerOnAvailablePort(8787, server)
				store.setValue("server_port", port)
				log.info(`服务器在端口 ${port} 上启动`)
			})
		} else {
			const port = await startServerOnAvailablePort(8787, server)
			store.setValue("server_port", port)
			log.info(`服务器在端口 ${port} 上启动`)
		}

		// -- 创建系统托盘
		tray = createTray()
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

	// -- 当应用程序准备就绪时
	app.whenReady().then(async () => {
		const mainWindow = windowManager.getWindow()

		// -- 设置错误处理程序
		setupErrorHandlers()

		// -- 设置应用生命周期
		setupAppLifecycle(tray)

		is.dev && mainWindow?.webContents.openDevTools()

		// -- 监听用户信息同步
		ipcMain.on("sync-user-state", async (_event, userState) => {
			logger.info("[user] 信息已同步")
			await userStore.setUserState(userState)
		})

		// -- 监听获取用户信息请求
		ipcMain.handle("get-user-account", async () => {
			return await userStore.getUserAccount()
		})

		// -- 监听清除用户信息请求
		ipcMain.on("clear-user-state", async () => {
			logger.info("[user] 信息已清除")
			await userStore.clearUserState()
		})

		// -- 监听更新用户信息请求（带两小时缓存）
		ipcMain.handle("update-user-info", async (_event, isForce = false) => {
			return await userStore.updateUserInfo(isForce)
		})
	})

	// -- 当应用程序激活时
	app.on("activate", async () => {
		const win = windowManager.getWindowById()

		// 强制杀掉所有相关的进程
		await killAllKernalByForce(true)

		if (win) {
			if (win.isMinimized() || !win.isVisible()) {
				win.show()
				win.restore()
			}
			win.focus()
		}

		// -- 监听系统即将休眠事件
		powerMonitor.on("suspend", () => {
			win?.webContents.send("power-status", "suspend")
		})

		// -- 监听系统从休眠中唤醒事件
		powerMonitor.on("resume", () => {
			win?.webContents.send("power-status", "resume")
		})
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
	})

	// 当退出流程全部完成后触发
	app.on("quit", async (_, exitCode) => {
		// 在这里添加你的清理或保存操作
		await cleanLockFiles()
		await killAllKernalByForce(true)
		logger.info(`应用已退出，退出码：${exitCode}`)
	})
}
