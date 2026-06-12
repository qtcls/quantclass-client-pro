/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { LoopStatus, PowerStatus } from "@/shared/types/index.js"
import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import { subscribeWithCleanup } from "@/shared/lib/ipc-subscription.js"
import { type IpcRendererEvent, ipcRenderer } from "electron"
import type { ProgressInfo } from "electron-updater"

export const emitterIPC = {
	/** 订阅内核更新中状态（boolean），返回只移除本次订阅的退订函数 */
	sendUpdateStatus: (
		callback: (event: IpcRendererEvent, isUpdating: boolean) => void,
	): (() => void) =>
		subscribeWithCleanup(ipcRenderer, IPC_CHANNELS.SEND_UPDATE_STATUS, callback),
	// onNetworkStatusChange: (callback: any) =>
	// 	ipcRenderer.on("network-status", callback),
	/** 订阅调度状态推送，返回只移除本次订阅的退订函数 */
	subscribeScheduleStatus: (
		callback: (event: IpcRendererEvent, status: LoopStatus) => void,
	): (() => void) =>
		subscribeWithCleanup(
			ipcRenderer,
			IPC_CHANNELS.SEND_SCHEDULE_STATUS,
			callback,
		),
	/** 订阅应用更新下载进度（payload-only，不透出 IpcRendererEvent），返回作用域退订函数 */
	onUpdateProgress: (
		callback: (progress: ProgressInfo) => void,
	): (() => void) =>
		subscribeWithCleanup(
			ipcRenderer,
			IPC_CHANNELS.UPDATE_PROGRESS,
			(_event, progress: ProgressInfo) => callback(progress),
		),
	/** 订阅系统休眠/唤醒事件（payload-only），返回作用域退订函数 */
	onPowerStatus: (callback: (status: PowerStatus) => void): (() => void) =>
		subscribeWithCleanup(
			ipcRenderer,
			IPC_CHANNELS.POWER_STATUS,
			(_event, status: PowerStatus) => callback(status),
		),
	/** 用户确认安装应用更新（fire-and-forget；setupUpdater 未启用时发往无监听者，与既有行为一致） */
	appUpdaterConfirm: (option: boolean) => {
		ipcRenderer.send(IPC_CHANNELS.APP_UPDATER_CONFIRM, option)
	},
	logHandle: (
		msg: Partial<{
			message: string | Event
			source: string
			lineno: number
			colno: number
			error: Error
		}>,
	) => ipcRenderer.send(IPC_CHANNELS.LOG_ERROR, msg),
	openUrl: (url: string) => ipcRenderer.send(IPC_CHANNELS.OPEN_URL, url),
}
