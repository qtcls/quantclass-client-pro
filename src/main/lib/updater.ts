/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import path from "node:path"
import windowManager from "@/main/lib/WindowManager.js"
import { BASE_URL } from "@/main/vars.js"
import { MSG_CODE } from "@/shared/constants.js"
import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import { is, platform } from "@electron-toolkit/utils"
import { app, ipcMain } from "electron"
import pkg from "electron-updater"
import logger from "../utils/wiston.js"

const { autoUpdater } = pkg

// 自动下载更新
autoUpdater.autoDownload = false
autoUpdater.allowDowngrade = false
// 退出时自动安装更新
autoUpdater.autoInstallOnAppQuit = true
autoUpdater.autoRunAppAfterInstall = true

if (is.dev) {
	Object.defineProperty(app, "isPackaged", {
		get() {
			return true
		},
	})
	autoUpdater.updateConfigPath = path.join(
		__dirname,
		"../../dev-app-update.yml",
	)
}

// TODO: 这里需要再做一次接口，和24版本做区分，否则24版本会更新到25版本
autoUpdater.setFeedURL(`${BASE_URL}/api/data/banben_guanli_api/read_file`)

export default async () => {
	const win = windowManager.getWindow()!

	autoUpdater.autoDownload = false

	// 更新发生错误
	autoUpdater.on("error", (_info) => {
		// -- 检查是否为 sha512 校验错误
		if (_info.toString().includes("sha512 checksum mismatch")) {
			logger.error("sha512 校验失败")
			win.webContents.send(IPC_CHANNELS.REPORT_MSG, {
				code: MSG_CODE.UPDATE_INSTALL_FAILED,
				message: "安装失败，请前往网站下载最新版本覆盖",
			})
		} else {
			win.webContents.send(IPC_CHANNELS.REPORT_MSG, {
				code: MSG_CODE.UPDATE_INSTALL_FAILED,
				message: "检查更新失败",
			})
			logger.error(`检查更新失败: ${_info}`)
		}
	})

	autoUpdater.on("checking-for-update", (...args) => {
		logger.info(`checking-for-update, ${args}`)
	})

	//有新版本时
	autoUpdater.on("update-available", async (info) => {
		logger.info("有新版本发布了")
		logger.info(info)
		// TODO: 暂时只在 Windows 下自动下载，有 Apple 开发者账号后接触限制
		platform.isWindows && autoUpdater.downloadUpdate()
		win.webContents.send(IPC_CHANNELS.REPORT_MSG, {
			code: MSG_CODE.UPDATE_NOTICE,
			message: info,
		})
	})

	autoUpdater.on("update-not-available", (_info) => {
		win.webContents.send(IPC_CHANNELS.REPORT_MSG, {
			code: MSG_CODE.UPDATE_NOT_AVAILABLE,
			message: "客户端已是最新版本",
		})
	})

	// 更新下载完毕
	autoUpdater.on("update-downloaded", async (info) => {
		logger.info("下载完毕！提示安装更新")
		logger.info(JSON.stringify(info, null, 2))

		win.webContents.send(IPC_CHANNELS.REPORT_MSG, {
			code: MSG_CODE.UPDATE_DOWNLOAD_FINISH,
			message: "更新下载完毕，请空闲时手动确认或重启客户端自动安装",
			info: info,
		})
		// autoUpdater.quitAndInstall(false)
	})

	ipcMain.once(IPC_CHANNELS.APP_UPDATER_CONFIRM, () => {
		logger.info("应用客户端更新")
		autoUpdater.quitAndInstall(false)
	})

	// 监听下载进度
	// ⚠️ "download-progress" 是 electron-updater 的 EventEmitter 事件名（非 IPC 频道），
	// 与 IPC_CHANNELS.DOWNLOAD_PROGRESS 同名纯属巧合，勿替换成常量
	autoUpdater.on("download-progress", (progress) => {
		logger.info(`下载进度, ${JSON.stringify(progress, null, 2)}`)
		win.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, progress)
	})

	// 这个updater主要是用于客户端的自更新逻辑，短时间内都没有启用的计划
	ipcMain.handle(IPC_CHANNELS.CHECK_GITHUB_UPDATE, async () => {
		return await autoUpdater.checkForUpdates()
	})
}
