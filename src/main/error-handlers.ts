/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import WindowManager from "@/main/lib/WindowManager.js"
import { app } from "electron"
import log from "electron-log/main.js"

/**
 * 设置错误处理程序
 * -- 该函数添加了 1 个 setupErrorHandlers 函数
 */
export function setupErrorHandlers() {
	// -- 监听渲染进程崩溃事件
	app.on("render-process-gone", (event, webContents, details) => {
		log.error(
			`APP-ERROR:render-process-gone; event: ${JSON.stringify(event)}; webContents:${JSON.stringify(
				webContents,
			)}; details:${JSON.stringify(details)}`,
		)

		// -- 重启渲染进程
		if (details.reason === "killed") {
			WindowManager.getLiveWindow()?.reload()
		}
	})

	// -- 监听子进程崩溃事件
	app.on("child-process-gone", (event, details) => {
		log.error(
			`APP-ERROR:child-process-gone; event: ${JSON.stringify(event)}; details:${JSON.stringify(details)}`,
		)

		if (details.type === "Utility" && details.name === "Network Service") {
			// -- 重新初始化网络服务
			app.relaunch()
			app.exit(0)
		}
	})

	// -- 监听未捕获的异常
	process.on("uncaughtException", (error) => {
		log.error(`Uncaught Exception: ${error.message}`)
	})

	// -- 监听未处理的 Promise 拒绝
	process.on("unhandledRejection", (reason, promise) => {
		log.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`)
	})
}
