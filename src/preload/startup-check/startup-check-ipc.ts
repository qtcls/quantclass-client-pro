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
	alignFolderAndDb,
	analyzeDataConsistency,
	checkNetworkConnectivity,
	checkQmtConnect,
	purgeDataRecycleBinItems,
	readDataRecycleBin,
	removeFromRecycleBin,
	type StartupCheckResult,
} from "@/main/lib/startup-check/index.js"
import type { DataRecycleBinEntry } from "@/shared/types/data-recycle-bin.js"
import type {
	DataConsistencyActionResult,
	DataConsistencyReport,
} from "@/shared/types/startup-check.js"
import { ipcMain } from "electron"

export type {
	StartupCheckResult,
	DataConsistencyReport,
	DataConsistencyActionResult,
}

export const regStartupCheckIPC = () => {
	ipcMain.handle(
		"startup-check:network",
		async (): Promise<StartupCheckResult> => {
			return await checkNetworkConnectivity()
		},
	)

	ipcMain.handle(
		"startup-check:qmt",
		async (): Promise<StartupCheckResult> => {
			return await checkQmtConnect()
		},
	)

	ipcMain.handle(
		"startup-check:data:analyze",
		async (): Promise<DataConsistencyReport> => {
			return await analyzeDataConsistency()
		},
	)

	ipcMain.handle(
		"startup-check:data:align",
		async (
			_event,
			report: DataConsistencyReport,
		): Promise<DataConsistencyActionResult> => {
			try {
				await alignFolderAndDb(report)
				return { ok: true }
			} catch (e) {
				const error = e instanceof Error ? e.message : String(e)
				return { ok: false, error }
			}
		},
	)

	ipcMain.handle(
		"startup-check:data:recycle-bin:list",
		async (): Promise<DataRecycleBinEntry[]> => readDataRecycleBin(),
	)

	ipcMain.handle(
		"startup-check:data:recycle-bin:remove",
		async (
			_event,
			names: string[],
		): Promise<DataConsistencyActionResult> => {
			try {
				await removeFromRecycleBin(names)
				return { ok: true }
			} catch (e) {
				const error = e instanceof Error ? e.message : String(e)
				return { ok: false, error }
			}
		},
	)

	ipcMain.handle(
		"startup-check:data:recycle-bin:purge",
		async (
			_event,
			names: string[],
		): Promise<DataConsistencyActionResult> => {
			try {
				await purgeDataRecycleBinItems(names)
				return { ok: true }
			} catch (e) {
				const error = e instanceof Error ? e.message : String(e)
				return { ok: false, error }
			}
		},
	)

	console.log("[reg] startup-check-ipc")
}
