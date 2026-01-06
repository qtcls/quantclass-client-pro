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
import { is, platform } from "@electron-toolkit/utils"
import { Menu, type NativeImage, Tray, app } from "electron"
import MacTray from "/build/XBX-bar.png?asset"
import WinTray from "/build/icon.ico?asset"

export function createTray() {
	const mw = windowManager.getWindow()
	let imgPath: string | NativeImage = ""

	if (is.dev) {
		if (platform.isMacOS) {
			imgPath = path.resolve(__dirname, "../../build/XBX-bar.png")
		}
		if (platform.isWindows) {
			imgPath = path.resolve(__dirname, "../../build/icon.ico")
		}
	} else {
		if (platform.isMacOS) {
			imgPath = MacTray
		}
		if (platform.isWindows) {
			imgPath = WinTray
		}
	}

	const tray = new Tray(imgPath)

	const contextMenu = Menu.buildFromTemplate([
		{
			label: "显示窗口",
			role: "unhide",
			type: "normal",
			click: () => {
				mw?.show()
			},
		},
		{
			label: "退出",
			type: "normal",
			accelerator: "CmdOrCtrl+Q",
			click: () => {
				tray.destroy()
				mw?.destroy()
				app.quit()
			},
		},
	])

	tray.setToolTip("QuantclassData")
	tray.setContextMenu(contextMenu)

	tray.on("double-click", () => {
		mw?.show()
	})

	return tray
}
