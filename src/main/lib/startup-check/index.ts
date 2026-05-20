/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export type {
	FuelProbeResult,
	RunFuelProbeOptions,
} from "@/main/lib/startup-check/fuel-probe.js"
export { runFuelProbe } from "@/main/lib/startup-check/fuel-probe.js"

export type { StartupCheckResult } from "@/main/lib/startup-check/network-qmt.js"
export {
	checkNetworkConnectivity,
	checkQmtConnect,
} from "@/main/lib/startup-check/network-qmt.js"

export type { DataConsistencyReport } from "@/shared/types/startup-check.js"
export {
	alignFolderAndDb,
	analyzeDataConsistency,
} from "@/main/lib/startup-check/data-consistency.js"
export {
	purgeDataRecycleBinItems,
	readDataRecycleBin,
	restoreDataRecycleBinItems,
} from "@/main/lib/startup-check/data-recycle-bin.js"
