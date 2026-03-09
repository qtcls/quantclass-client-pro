/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { IRes } from "@/main/server/types/index.js"
import { ipcRenderer } from "electron"

export const coreIPC = {
	reportError: (cb: (res: IRes) => void) =>
		ipcRenderer.on("report-msg", (_event, res: IRes) => cb(res)),
	removeReportErrorListener: () => {
		ipcRenderer.removeAllListeners("report-msg")
	},
	toggleHandler: (isUpdating: boolean) =>
		ipcRenderer.invoke("toggle-handle", isUpdating),
	syncNetworkStatus: (isOnline: boolean) => {
		ipcRenderer.send("sync-network-status", isOnline)
	},
	setAutoTrading: (isAutoTrading: boolean) => {
		ipcRenderer.invoke("set-auto-trading", isAutoTrading)
	},
	toggleMinDataSchedule: (options: {
		isOn: boolean
		mode?: "fast" | "stable"
		autoAccurate?: boolean
		autoFuzzy?: boolean
	}) => ipcRenderer.invoke("toggle-min-data-schedule", options),
	getMinDataScheduleStatus: () =>
		ipcRenderer.invoke("get-min-data-schedule-status") as Promise<{
			isRunning: boolean
			mode: "fast" | "stable"
			autoAccurate: boolean
			autoFuzzy: boolean
		}>,
	onMinDataScheduleStatus: (
		callback: (
			event: Electron.IpcRendererEvent,
			status: { type: string; task?: string; reason?: string },
		) => void,
	) => {
		ipcRenderer.on("min-data-schedule-status", callback)
	},
	removeMinDataScheduleStatusListener: () => {
		ipcRenderer.removeAllListeners("min-data-schedule-status")
	},
}
