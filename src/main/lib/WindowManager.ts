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
import { is } from "@electron-toolkit/utils"
import { BrowserWindow } from "electron"
import {
	WINDOW_HEIGHT,
	WINDOW_MIN_HEIGHT,
	WINDOW_MIN_WIDTH,
	WINDOW_WIDTH,
} from "../utils/common.js"

class WindowManager {
	private mainWindow: BrowserWindow | null = null
	private windows: Map<string, BrowserWindow> = new Map()

	// -- 创建主窗口
	createWindow(): BrowserWindow {
		this.mainWindow = new BrowserWindow({
			height: WINDOW_HEIGHT,
			width: WINDOW_WIDTH,
			minHeight: WINDOW_MIN_HEIGHT,
			minWidth: WINDOW_MIN_WIDTH,
			frame: false,
			show: false,
			trafficLightPosition: {
				x: 10,
				y: 10,
			},
			autoHideMenuBar: true,
			titleBarStyle: "hidden",
			webPreferences: {
				preload: fileURLToPath(
					new URL("../preload/index.mjs", import.meta.url),
				),
				nodeIntegration: true,
				webSecurity: false,
			},
		})
		this.mainWindow.webContents.session.setPermissionRequestHandler(
			(_, permission, callback) => {
				const allowedPermissions = ["media", "openExternal"]
				if (allowedPermissions.includes(permission)) {
					callback(true)
				} else {
					callback(false)
				}
			},
		)

		this.windows.set("main", this.mainWindow)
		return this.mainWindow
	}

	// -- 创建子窗口
	createChildWindow(
		windowId: string,
		options: Partial<Electron.BrowserWindowConstructorOptions> = {},
	): BrowserWindow {
		const win = new BrowserWindow({
			height: 600,
			width: 800,
			frame: false,
			show: false,
			trafficLightPosition: {
				x: 10,
				y: 10,
			},
			autoHideMenuBar: true,
			titleBarStyle: "hidden",
			...options,
			webPreferences: {
				preload: fileURLToPath(
					new URL("../preload/index.mjs", import.meta.url),
				),
				nodeIntegration: true,
				webSecurity: false,
				...options.webPreferences,
			},
		})

		if (windowId === "terminal") {
			if (is.dev && process.env.ELECTRON_RENDERER_URL) {
				win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/terminal.html`)
			} else {
				win.loadFile(
					fileURLToPath(new URL("../renderer/terminal.html", import.meta.url)),
				)
			}
		}

		this.windows.set(windowId, win)

		if (windowId !== "terminal") {
			// -- 在窗口准备好后显示
			win.once("ready-to-show", () => {
				win.show()
			})
		}

		// -- 窗口关闭时从 Map 中移除
		win.on("closed", () => {
			this.windows.delete(windowId)
		})

		return win
	}

	// -- 获取指定窗口
	getWindow(): BrowserWindow | null {
		return this.mainWindow
	}

	// -- 新增方法，通过 id 获取窗口
	getWindowById(windowId = "main"): BrowserWindow | undefined {
		return this.windows.get(windowId)
	}

	// -- 获取所有窗口
	getAllWindows(): BrowserWindow[] {
		return Array.from(this.windows.values())
	}

	// -- 关闭指定窗口
	closeWindow(windowId: string): void {
		const win = this.windows.get(windowId)
		if (win && !win.isDestroyed()) {
			win.close()
		}
	}

	// -- 关闭所有窗口
	closeAllWindows(): void {
		for (const win of this.windows.values()) {
			if (!win.isDestroyed()) {
				win.close()
			}
		}
	}
}

export default new WindowManager()
