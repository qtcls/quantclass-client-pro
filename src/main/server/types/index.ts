/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import type { ProgressInfo, UpdateInfo } from "electron-updater"

export interface IRes {
	info?: UpdateInfo
	message: string | UpdateInfo
	process?: ProgressInfo
	code: number
	msgType?: "info" | "success" | "warning" | "error"
}

export interface Env {
	Variables: {
		db: BetterSQLite3Database | null
	}
}

export interface ColumnInfo {
	cid: number
	name: string
	type: string
	notnull: number
	dflt_value: any
	pk: number
}

export interface HeartbeatStatus {
	lastHeartbeat: number
	isAlive: boolean
}
