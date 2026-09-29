/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { StartupCheckResult } from "@/preload/startup-check/startup-check-ipc.js"
import type { DataRecycleBinEntry } from "@/shared/types/data-recycle-bin.js"
import type {
	StartupCheckReportPayload,
	StartupCheckScheduleConfig,
} from "@/shared/types/startup-check-schedule.js"
import type {
	DataConsistencyActionResult,
	DataConsistencyReport,
} from "@/shared/types/startup-check.js"
import { ipcRenderer } from "electron"

export type {
	StartupCheckResult,
	DataConsistencyReport,
	DataConsistencyActionResult,
	StartupCheckScheduleConfig,
	StartupCheckReportPayload,
}

export const startupCheckIPC = {
	checkStartupNetwork: () =>
		ipcRenderer.invoke("startup-check:network") as Promise<StartupCheckResult>,
	checkStartupQmtConnect: () =>
		ipcRenderer.invoke("startup-check:qmt") as Promise<StartupCheckResult>,
	checkDataConsistencyAnalyze: () =>
		ipcRenderer.invoke(
			"startup-check:data:analyze",
		) as Promise<DataConsistencyReport>,
	checkDataConsistencyAlign: (report: DataConsistencyReport) =>
		ipcRenderer.invoke(
			"startup-check:data:align",
			report,
		) as Promise<DataConsistencyActionResult>,
	getDataRecycleBin: () =>
		ipcRenderer.invoke(
			"startup-check:data:recycle-bin:list",
		) as Promise<DataRecycleBinEntry[]>,
	removeDataRecycleBinItems: (names: string[]) =>
		ipcRenderer.invoke(
			"startup-check:data:recycle-bin:remove",
			names,
		) as Promise<DataConsistencyActionResult>,
	purgeDataRecycleBinItems: (names: string[]) =>
		ipcRenderer.invoke(
			"startup-check:data:recycle-bin:purge",
			names,
		) as Promise<DataConsistencyActionResult>,
	getStartupCheckScheduleConfig: () =>
		ipcRenderer.invoke(
			"startup-check:get-schedule-config",
		) as Promise<StartupCheckScheduleConfig>,
	setStartupCheckDailyEnabled: (enabled: boolean) =>
		ipcRenderer.invoke(
			"startup-check:set-daily-enabled",
			enabled,
		) as Promise<{ ok: true }>,
	setStartupCheckDailyTimes: (times: string[]) =>
		ipcRenderer.invoke(
			"startup-check:set-daily-times",
			times,
		) as Promise<{ ok: boolean; error?: string }>,
	setStartupCheckPushResultEnabled: (enabled: boolean) =>
		ipcRenderer.invoke(
			"startup-check:set-push-result-enabled",
			enabled,
		) as Promise<{ ok: true }>,
	reportStartupCheckResult: (payload: StartupCheckReportPayload) =>
		ipcRenderer.invoke(
			"startup-check:report-result",
			payload,
		) as Promise<{ ok: true }>,
}
