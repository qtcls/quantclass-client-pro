/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import {
	getRealTradingBackupConfigPayload,
	runRealTradingBackup,
	setRealTradingBackupDailyTime,
	setRealTradingBackupEnabled,
} from "@/main/lib/real-trading-backup.js"
import type {
	RealTradingBackupConfigPayload,
	RealTradingBackupResult,
} from "@/main/lib/real-trading-backup.js"
import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import { ipcMain } from "electron"

export const regRealTradingBackupIPC = () => {
	ipcMain.handle(
		IPC_CHANNELS.REAL_TRADING_BACKUP_GET_CONFIG,
		async (): Promise<RealTradingBackupConfigPayload> => {
			return await getRealTradingBackupConfigPayload()
		},
	)

	ipcMain.handle(
		IPC_CHANNELS.REAL_TRADING_BACKUP_SET_DAILY_TIME,
		async (_event, timeHHmm: string) => {
			return setRealTradingBackupDailyTime(timeHHmm)
		},
	)

	ipcMain.handle(
		IPC_CHANNELS.REAL_TRADING_BACKUP_SET_ENABLED,
		async (_event, enabled: boolean) => {
			return setRealTradingBackupEnabled(enabled)
		},
	)

	ipcMain.handle(
		IPC_CHANNELS.REAL_TRADING_BACKUP_RUN_NOW,
		async (): Promise<RealTradingBackupResult> => {
			return await runRealTradingBackup()
		},
	)

	console.log("[reg] real-trading-backup-ipc")
}
