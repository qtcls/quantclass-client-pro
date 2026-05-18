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
	type StartupCheckResult,
	checkNetworkConnectivity,
	checkQmtConnect,
} from "@/main/lib/startup-check.js"
import { ipcMain } from "electron"

export type { StartupCheckResult }

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

	console.log("[reg] startup-check-ipc")
}
