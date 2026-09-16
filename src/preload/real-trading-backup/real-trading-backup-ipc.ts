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
	RunRealTradingBackupOptions,
} from "@/main/lib/real-trading-backup.js"
import { ipcMain } from "electron"

export type {
	RealTradingBackupConfigPayload,
	RealTradingBackupResult,
	RunRealTradingBackupOptions,
}

export const regRealTradingBackupIPC = () => {
	ipcMain.handle(
		"real-trading-backup:get-config",
		async (): Promise<RealTradingBackupConfigPayload> => {
			return await getRealTradingBackupConfigPayload()
		},
	)

	ipcMain.handle(
		"real-trading-backup:set-daily-time",
		async (_event, timeHHmm: string) => {
			return setRealTradingBackupDailyTime(timeHHmm)
		},
	)

	ipcMain.handle(
		"real-trading-backup:set-enabled",
		async (_event, enabled: boolean) => {
			return setRealTradingBackupEnabled(enabled)
		},
	)

	ipcMain.handle(
		"real-trading-backup:run-now",
		async (): Promise<RealTradingBackupResult> => {
			return await runRealTradingBackup()
		},
	)

	console.log("[reg] real-trading-backup-ipc")
}
