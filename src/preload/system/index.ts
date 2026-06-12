/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import type { KernalType } from "@/shared/types/kernal.js"
import { ipcRenderer } from "electron"

export const systemIPC = {
	// 进程控制
	handleKillProcess: (pid: number) =>
		ipcRenderer.invoke(IPC_CHANNELS.KILL_PROCESS, pid),
	killAllKernals: (byForce = false) =>
		ipcRenderer.invoke(IPC_CHANNELS.KILL_ALL_KERNALS, byForce),
	killKernal: (kernal: KernalType, byForce = false) =>
		ipcRenderer.invoke(IPC_CHANNELS.KILL_KERNAL, kernal, byForce),

	// 全屏控制
	handleToggleFullscreen: (key = "main") =>
		ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_FULLSCREEN, key),
	fetchFullscreenState: (key?: string) =>
		ipcRenderer.invoke(IPC_CHANNELS.FETCH_FULLSCREEN_STATE, key),

	// 窗口控制 - 从renderer/ipc/system.ts迁移
	createTerminalWindow: () =>
		ipcRenderer.invoke(IPC_CHANNELS.CREATE_TERMINAL_WINDOW),
	focusMainWindows: () => ipcRenderer.invoke(IPC_CHANNELS.FOCUS_MAIN_WINDOWS),
	closeApp: (key = "main") => ipcRenderer.invoke(IPC_CHANNELS.CLOSE_APP, key),
	minimizeApp: (key = "main") =>
		ipcRenderer.invoke(IPC_CHANNELS.MINIMIZE_APP, key),
	restartApp: () => ipcRenderer.invoke(IPC_CHANNELS.RESTART_APP),

	// 系统配置
	setAutoLaunch: (auto: boolean) =>
		ipcRenderer.invoke(IPC_CHANNELS.SET_IS_AUTO_LOGIN, auto),
	// 版本管理
	checkUpdate: (now = true) => ipcRenderer.invoke(IPC_CHANNELS.CHECK_UPDATE, now),
	updateKernal: (name: KernalType, targetVersion?: string) =>
		ipcRenderer.invoke(IPC_CHANNELS.UPDATE_KERNAL, name, targetVersion),
	getAppAndKernalVersions: () =>
		ipcRenderer.invoke(IPC_CHANNELS.GET_APP_AND_KERNAL_VERSIONS),

	// 系统信息
	getMacAddress: () => ipcRenderer.invoke(IPC_CHANNELS.GET_MAC_ADDRESS),
	// 检查内核是否运行
	checkKernalRunning: (
		kernals: ("rocket" | "aqua" | "zeus" | "fuel")[] = ["rocket"],
	) =>
		ipcRenderer.invoke(
			IPC_CHANNELS.CHECK_KERNAL_RUNNING,
			kernals,
		) as Promise<boolean>,
}
