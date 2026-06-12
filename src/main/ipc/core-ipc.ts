/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { networkInterfaces } from "node:os"
import {
	setAutoMinData,
	setAutoTrading,
	setAutoUpdate,
	systemState,
} from "@/main/lib/scheduler.js"
import logger from "@/main/utils/wiston.js"
import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import type { SetAutoTradingAck } from "@/shared/types/trading.js"
import { ipcMain } from "electron"

async function toggleHandler(): Promise<void> {
	ipcMain.handle(IPC_CHANNELS.TOGGLE_HANDLE, (_event: { sender: any }, isOn: boolean) => {
		// -- 数据更新路径保持 fire-and-forget（不改既有行为）；setAutoUpdate 内部已自捕获异常
		void setAutoUpdate(isOn)
	})
}

async function setAutoTradingHandler(): Promise<void> {
	ipcMain.handle(
		IPC_CHANNELS.SET_AUTO_TRADING,
		async (
			_event: { sender: any },
			isOn: boolean,
		): Promise<SetAutoTradingAck> => {
			try {
				// -- 返回主进程权威 ack 供 renderer await
				return await setAutoTrading(isOn)
			} catch (error) {
				// -- T1：绝不 reject，永远 resolve 良定义 ack（避免 renderer toggle 挂起）
				// -- fail-closed：异常时复用 disable 路径（MAIN 强杀 rocket + 写 store + 置 flag false）
				logger.error(`[trade] set-auto-trading 异常: ${error}`)
				try {
					const ack = await setAutoTrading(false)
					return { ...ack, ok: false, reason: "exception" }
				} catch (innerError) {
					logger.error(`[trade] set-auto-trading 异常回滚失败: ${innerError}`)
					return {
						ok: false,
						isSetAutoTrading: false,
						schedulerRunning: systemState.job !== null,
						rocketRunning: false,
						reason: "exception",
					}
				}
			}
		},
	)
}

async function syncNetworkStatusHandler() {
	// -- 监听网络状态变化
	ipcMain.on(IPC_CHANNELS.SYNC_NETWORK_STATUS, (_event, isOnline: boolean) => {
		systemState.isOnline = isOnline
		logger.info(`[network] ${isOnline ? "在线" : "离线"}`)
	})
}

async function getMacAddressHandler(): Promise<void> {
	ipcMain.handle(IPC_CHANNELS.GET_MAC_ADDRESS, async () => {
		const interfaces = networkInterfaces()
		for (const interfaceDetails of Object.values(interfaces)) {
			if (interfaceDetails) {
				for (const detail of interfaceDetails) {
					if (!detail.internal) {
						return detail.mac
					}
				}
			}
		}

		return ""
	})
}

async function toggleMinDataScheduleHandler(): Promise<void> {
	ipcMain.handle(
		IPC_CHANNELS.TOGGLE_MIN_DATA_SCHEDULE,
		(
			_event,
			options: {
				isOn: boolean
				mode?: "fast" | "stable"
				autoAccurate?: boolean
				autoFuzzy?: boolean
			},
		) => {
			setAutoMinData(options)
		},
	)
}

export const regCoreIPC = () => {
	toggleHandler()
	setAutoTradingHandler()
	getMacAddressHandler()
	syncNetworkStatusHandler()
	toggleMinDataScheduleHandler()
	console.log("[reg] core-ipc")
}
