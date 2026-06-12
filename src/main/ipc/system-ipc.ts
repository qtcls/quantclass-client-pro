/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { getAppAndKernalVersions } from "@/main/core/lib.js"
import { checkRemoteVersions, updateKernal } from "@/main/core/runpy.js"
import windowManager from "@/main/lib/WindowManager.js"
import { process_manager } from "@/main/lib/process.js"
import { killAllKernalByForce, killKernalByForce } from "@/main/utils/tools.js"
import { log } from "@/main/utils/wiston.js"
import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import type { KernalType } from "@/shared/types/index.js"
import { electronApp, platform } from "@electron-toolkit/utils"
import { app, ipcMain } from "electron"

async function handleToggleFullscreen() {
	ipcMain.handle(IPC_CHANNELS.TOGGLE_FULLSCREEN, async (_event, key = "main") => {
		const win = windowManager.getWindowById(key)

		if (win) {
			win.isMaximized() ? win.unmaximize() : win.maximize()
		}
	})
}

async function handleSetAutoLogin() {
	ipcMain.handle(IPC_CHANNELS.SET_IS_AUTO_LOGIN, async (_event, auto: boolean) => {
		if (platform.isMacOS) {
			electronApp.setAutoLaunch(auto)
		}
		if (platform.isWindows) {
			app.setLoginItemSettings({
				openAtLogin: auto,
			})
		}
	})
}

function handleMinimize() {
	ipcMain.handle(IPC_CHANNELS.MINIMIZE_APP, async (_event, key = "main") => {
		const win = windowManager.getWindowById(key)

		if (win) {
			// mw.focus()
			win.minimize()
		}
	})
}

function handleClose() {
	ipcMain.handle(IPC_CHANNELS.CLOSE_APP, async (_event, key = "main") => {
		const win = windowManager.getWindowById(key)

		if (win) {
			win.close()
		}
	})
}

function fetchFullscreenState() {
	ipcMain.handle(IPC_CHANNELS.FETCH_FULLSCREEN_STATE, async (_event, key = "main") => {
		const win = windowManager.getWindowById(key)

		return win ? win.isMaximized() : false
	})
}

function handleMonitorProcess() {
	ipcMain.handle(IPC_CHANNELS.FETCH_MONITOR_PROCESSES, async () => {
		return process_manager.getRunningProcesses()
	})
}

function handleCheckKernalRunning() {
	ipcMain.handle(
		IPC_CHANNELS.CHECK_KERNAL_RUNNING,
		async (
			_event,
			kernals: ("rocket" | "aqua" | "zeus" | "fuel")[] = ["rocket"],
		) => {
			const { isAnyKernalBusy } = await import("@/main/utils/tools.js")
			return await isAnyKernalBusy(kernals)
		},
	)
}

function handleKillProcess() {
	ipcMain.handle(IPC_CHANNELS.KILL_PROCESS, async (_event, pid: number) => {
		return await process_manager.killProcess(pid)
	})
}

function handleKillAllKernals() {
	ipcMain.handle(IPC_CHANNELS.KILL_ALL_KERNALS, async (_event, byForce = false) => {
		return await killAllKernalByForce(byForce)
	})
}

function handleKillKernal() {
	ipcMain.handle(
		IPC_CHANNELS.KILL_KERNAL,
		async (_event, kernal: KernalType, byForce = false) => {
			return await killKernalByForce(kernal, byForce)
		},
	)
}

function handleRendererLog() {
	ipcMain.handle(
		IPC_CHANNELS.DO_RENDERER_LOG,
		async (_event, type: "info" | "error" | "warning", msg: string) => {
			log(type, `[Renderer] ${msg}`)
		},
	)
}

function handleLogError() {
	ipcMain.on(
		IPC_CHANNELS.LOG_ERROR,
		(_event, { message, source, lineno, colno, error }) => {
			log(
				"error",
				`message: ${message}, source: ${source}, lineno: ${lineno}, colno: ${colno}, error: ${error}`,
			)
		},
	)
}

function handleRestartApp() {
	ipcMain.handle(IPC_CHANNELS.RESTART_APP, async () => {
		const mainWindow = windowManager.getWindow()
		if (mainWindow) {
			mainWindow.removeAllListeners()
			mainWindow.destroy()
		}
		app.relaunch()
		app.quit()
	})
}

async function handleCheckUpdate(): Promise<void> {
	ipcMain.handle(IPC_CHANNELS.CHECK_UPDATE, async (_event, now = true) => {
		return await checkRemoteVersions(now)
	})
}

async function handleGetAppAndKernalVersions(): Promise<void> {
	ipcMain.handle(IPC_CHANNELS.GET_APP_AND_KERNAL_VERSIONS, async () => {
		return await getAppAndKernalVersions()
	})
}

async function handleUpdateKernal(): Promise<void> {
	ipcMain.handle(
		IPC_CHANNELS.UPDATE_KERNAL,
		async (_event, name: KernalType, targetVersion?: string) => {
			return await updateKernal(name as KernalType, targetVersion)
		},
	)
}

export const regSystemIPC = () => {
	handleClose()
	handleMinimize()
	handleRendererLog()
	handleLogError()
	handleKillProcess()
	handleKillAllKernals()
	handleKillKernal()
	handleSetAutoLogin()
	fetchFullscreenState()
	handleMonitorProcess()
	handleCheckKernalRunning()
	handleToggleFullscreen()
	handleRestartApp()
	handleGetAppAndKernalVersions()
	handleUpdateKernal()
	handleCheckUpdate()
	console.log("[reg] system-ipc")
}
