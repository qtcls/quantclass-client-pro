/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { fileURLToPath } from "node:url"
import windowManager from "@/main/lib/WindowManager.js"
import { createMenu } from "@/main/lib/menu.js"
import { postUserMainAction } from "@/main/request/index.js"
import { stopHeartbeatCheck } from "@/main/server/heartbeat.js"
import { cleanLockFiles, killAllKernalByForce } from "@/main/utils/tools.js"
import logger from "@/main/utils/wiston.js"
import { is } from "@electron-toolkit/utils"
import dayjs from "dayjs"
import { type Tray, app, dialog, ipcMain } from "electron"
import Store from "electron-store"

const { platform } = process

const store = new Store()

let isQuitting = false // -- 添加一个标志来表示是否正在退出应用
let isClosing = false

export const createWindow = async (tray?: Tray): Promise<void> => {
	windowManager.createWindow()

	const mainWindow = windowManager.getWindow()
	if (!mainWindow) {
		throw new Error("Failed to create main window")
	}

	mainWindow.once("ready-to-show", () => {
		if (!app.getLoginItemSettings().wasOpenedAsHidden) mainWindow.show()
	})

	if (is.dev && process.env.ELECTRON_RENDERER_URL) {
		await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
	} else {
		await mainWindow.loadFile(
			fileURLToPath(new URL("../renderer/index.html", import.meta.url)),
		)
	}

	createMenu(mainWindow, tray)

	// -- 隐藏窗口而不是完全关闭
	mainWindow.on("close", (e: Electron.Event) => {
		if (isQuitting) return // 如果已经在退出过程中，直接返回
		if (isClosing) return // 如果已经在关闭过程中，直接返回

		e.preventDefault() // 阻止默认的关闭行为
		isClosing = true // 设置关闭标志

		const closeApp = async () => {
			try {
				const isMinimize = await store.get("settings.user_choice", false)
				logger.info("[settings.user_choice] 用户设置最小化到托盘: ", isMinimize)

				if (!isMinimize) {
					const { response, checkboxChecked } = await dialog.showMessageBox({
						type: "question",
						buttons: ["最小化", "退出程序", "取消"],
						cancelId: 2, // 取消按钮的索引
						defaultId: 2, // 默认选中的按钮
						title: "确认退出量化小讲堂客户端",
						message:
							"你想要退出应用还是最小化？退出会同时停止数据更新和自动实盘",
						// checkboxLabel: "记住我的选择，不再提示",
						// checkboxChecked: false,
					})

					if (checkboxChecked) {
						store.set("settings.user_choice", response !== 0)
					}

					// 1 为直接退出
					if (response === 1) {
						isQuitting = true
						mainWindow.destroy()
						app.quit()
						return
					}
					// 2 为取消
					if (response === 2) {
						return
					}
				} else if (!isMinimize) {
					isQuitting = true
					mainWindow.destroy()
					app.quit()
					return
				}

				// 0. 最小化到系统托盘
				mainWindow?.minimize()
				mainWindow?.hide()

				if (platform === "darwin") {
					app.dock.hide()
				}
			} finally {
				isClosing = false // 重置关闭标志
			}
		}

		closeApp().catch(() => {
			isQuitting = true
			mainWindow.destroy()
			app.quit()
		})
	})

	app.on("before-quit", async () => {
		try {
			// -- 计算在线时长并发送埋点
			const endTime = dayjs()
			const _startTime = store.get("app.start_time", "") as string

			if (_startTime) {
				const startTime = dayjs(_startTime)
				const duration = endTime.diff(startTime, "minute")
				const apiKey = store.get("settings.api_key", "") as string
				const hid = store.get("settings.hid", "") as string

				if (apiKey && hid) {
					await postUserMainAction(apiKey, {
						uuid: hid,
						role: "user",
						action: `客户端在线时长: ${duration} 分钟`,
					})
					logger.info(`在线时长 ${duration} 分钟`)
				}
			}
		} catch {
			logger.error("在线时长计算失败")
		}

		// -- 强制杀掉所有相关的进程
		await killAllKernalByForce()

		// -- 删除内核更新锁文件
		await cleanLockFiles()

		stopHeartbeatCheck()
		app.quit()
	})

	ipcMain.on(
		"log-error",
		(_event, { message, source, lineno, colno, error }) => {
			logger.error(
				`message: ${message}, source: ${source}, lineno: ${lineno}, colno: ${colno}, error: ${error}`,
			)
		},
	)
}
