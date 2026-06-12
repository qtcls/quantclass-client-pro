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
import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import { subscribeWithCleanup } from "@/shared/lib/ipc-subscription.js"
import type { SetAutoTradingAck } from "@/shared/types/trading.js"
import { ipcRenderer } from "electron"

export const coreIPC = {
	/** 订阅 main 推送的消息报告（payload-only），返回只移除本次订阅的退订函数 */
	reportError: (cb: (res: IRes) => void): (() => void) =>
		subscribeWithCleanup(
			ipcRenderer,
			IPC_CHANNELS.REPORT_MSG,
			(_event, res: IRes) => cb(res),
		),
	toggleHandler: (isUpdating: boolean) =>
		ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_HANDLE, isUpdating),
	syncNetworkStatus: (isOnline: boolean) => {
		ipcRenderer.send(IPC_CHANNELS.SYNC_NETWORK_STATUS, isOnline)
	},
	setAutoTrading: (isAutoTrading: boolean): Promise<SetAutoTradingAck> =>
		ipcRenderer.invoke(IPC_CHANNELS.SET_AUTO_TRADING, isAutoTrading),
	toggleMinDataSchedule: (options: {
		isOn: boolean
		mode?: "fast" | "stable"
		autoAccurate?: boolean
		autoFuzzy?: boolean
	}) => ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_MIN_DATA_SCHEDULE, options),
	/** 订阅 min-data 调度状态推送，返回只移除本次订阅的退订函数 */
	onMinDataScheduleStatus: (
		callback: (
			event: Electron.IpcRendererEvent,
			status: { type: string; task?: string; reason?: string },
		) => void,
	): (() => void) =>
		subscribeWithCleanup(
			ipcRenderer,
			IPC_CHANNELS.MIN_DATA_SCHEDULE_STATUS,
			callback,
		),
}
