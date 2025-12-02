/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export interface IDataListType {
	name: string
	dataTime?: string | null
	fullData: string
	displayName: string
	ts?: string | null
	info?: string | null
	dataContentTime?: string
	lastUpdateTime?: string
	nextUpdateTime?: string | null
	fullDataDownloadUrl?: string | null
	fullDataDownloadExpires?: number | null
	isAutoUpdate: 0 | 1
	canAutoUpdate?: 0 | 1
	updateTime?: string | null
}
