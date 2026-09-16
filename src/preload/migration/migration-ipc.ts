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
	getPendingRendererMigrations,
	markMigrationDone,
} from "@/main/migration/runner.js"
import { ipcMain } from "electron"

export const regMigrationIPC = () => {
	ipcMain.handle("get-pending-renderer-migrations", () => {
		return getPendingRendererMigrations()
	})

	ipcMain.handle(
		"mark-migration-done",
		(_, id: string, success: boolean, error?: string) => {
			markMigrationDone(id, success, error)
		},
	)

	console.log("[reg] migration-ipc")
}
