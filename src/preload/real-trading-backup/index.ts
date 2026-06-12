/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

// -- S4：类型直指真源（type-only，preload 对 @/main 不引入运行时依赖）
import type { RealTradingBackupConfigPayload } from "@/main/lib/real-trading-backup.js"
import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import { ipcRenderer } from "electron"

export interface RealTradingBackupRunResult {
	ok: boolean
	zipPath?: string
	error?: string
	skipped?: boolean
}

export const realTradingBackupIPC = {
	getRealTradingBackupConfig: () =>
		ipcRenderer.invoke(
			IPC_CHANNELS.REAL_TRADING_BACKUP_GET_CONFIG,
		) as Promise<RealTradingBackupConfigPayload>,
	setRealTradingBackupDailyTime: (timeHHmm: string) =>
		ipcRenderer.invoke(
			IPC_CHANNELS.REAL_TRADING_BACKUP_SET_DAILY_TIME,
			timeHHmm,
		) as Promise<{
			ok: boolean
			error?: string
		}>,
	setRealTradingBackupEnabled: (enabled: boolean) =>
		ipcRenderer.invoke(
			IPC_CHANNELS.REAL_TRADING_BACKUP_SET_ENABLED,
			enabled,
		) as Promise<{ ok: true }>,
	runRealTradingBackupNow: () =>
		ipcRenderer.invoke(
			IPC_CHANNELS.REAL_TRADING_BACKUP_RUN_NOW,
		) as Promise<RealTradingBackupRunResult>,
}
