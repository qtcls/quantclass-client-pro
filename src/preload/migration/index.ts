/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import { ipcRenderer } from "electron"

export const migrationIPC = {
	getPendingRendererMigrations: (): Promise<string[]> =>
		ipcRenderer.invoke(IPC_CHANNELS.GET_PENDING_RENDERER_MIGRATIONS),
	markMigrationDone: (id: string, success: boolean, error?: string) =>
		ipcRenderer.invoke(IPC_CHANNELS.MARK_MIGRATION_DONE, id, success, error),
}
