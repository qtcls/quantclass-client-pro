/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { RealTradingBackupConfigPayload } from "@/preload/real-trading-backup/real-trading-backup-ipc.js"
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
			"real-trading-backup:get-config",
		) as Promise<RealTradingBackupConfigPayload>,
	setRealTradingBackupDailyTime: (timeHHmm: string) =>
		ipcRenderer.invoke(
			"real-trading-backup:set-daily-time",
			timeHHmm,
		) as Promise<{
			ok: boolean
			error?: string
		}>,
	runRealTradingBackupNow: () =>
		ipcRenderer.invoke(
			"real-trading-backup:run-now",
		) as Promise<RealTradingBackupRunResult>,
}
