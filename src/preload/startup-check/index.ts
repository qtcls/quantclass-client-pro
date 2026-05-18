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
import { ipcRenderer } from "electron"

export type { StartupCheckResult }

export const startupCheckIPC = {
	checkStartupNetwork: () =>
		ipcRenderer.invoke("startup-check:network") as Promise<StartupCheckResult>,
	checkStartupQmtConnect: () =>
		ipcRenderer.invoke("startup-check:qmt") as Promise<StartupCheckResult>,
}
