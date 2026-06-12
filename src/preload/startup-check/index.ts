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
import type { StartupCheckResult } from "@/main/lib/startup-check/network-qmt.js"
import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import type { DataRecycleBinEntry } from "@/shared/types/data-recycle-bin.js"
import type {
	DataConsistencyActionResult,
	DataConsistencyReport,
} from "@/shared/types/startup-check.js"
import { ipcRenderer } from "electron"

export type {
	StartupCheckResult,
	DataConsistencyReport,
	DataConsistencyActionResult,
}

export const startupCheckIPC = {
	checkStartupNetwork: () =>
		ipcRenderer.invoke(
			IPC_CHANNELS.STARTUP_CHECK_NETWORK,
		) as Promise<StartupCheckResult>,
	checkStartupQmtConnect: () =>
		ipcRenderer.invoke(
			IPC_CHANNELS.STARTUP_CHECK_QMT,
		) as Promise<StartupCheckResult>,
	checkDataConsistencyAnalyze: () =>
		ipcRenderer.invoke(
			IPC_CHANNELS.STARTUP_CHECK_DATA_ANALYZE,
		) as Promise<DataConsistencyReport>,
	checkDataConsistencyAlign: (report: DataConsistencyReport) =>
		ipcRenderer.invoke(
			IPC_CHANNELS.STARTUP_CHECK_DATA_ALIGN,
			report,
		) as Promise<DataConsistencyActionResult>,
	getDataRecycleBin: () =>
		ipcRenderer.invoke(
			IPC_CHANNELS.STARTUP_CHECK_DATA_RECYCLE_BIN_LIST,
		) as Promise<DataRecycleBinEntry[]>,
	removeDataRecycleBinItems: (names: string[]) =>
		ipcRenderer.invoke(
			IPC_CHANNELS.STARTUP_CHECK_DATA_RECYCLE_BIN_REMOVE,
			names,
		) as Promise<DataConsistencyActionResult>,
	purgeDataRecycleBinItems: (names: string[]) =>
		ipcRenderer.invoke(
			IPC_CHANNELS.STARTUP_CHECK_DATA_RECYCLE_BIN_PURGE,
			names,
		) as Promise<DataConsistencyActionResult>,
}
