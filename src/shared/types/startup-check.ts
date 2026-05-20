/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export interface DataConsistencyReport {
	diskSet: string[]
	dbSet: string[]
	listSet: string[]
	alignedDbDiff: { onlyDb: string[] }
	dataWhiteListA: string[]
	listDiff: { aOnly: string[]; bOnly: string[] }
}

export interface DataConsistencyActionResult {
	ok: boolean
	error?: string
}
