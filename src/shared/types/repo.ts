/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export type RepoApiType = "strategies" | "basic-code"

export interface RepoDownloadRecord {
	ticket: string
	fid: string
	itemId: string
	itemTitle: string
	versionName: string
	apiType: RepoApiType
	courseName: string
	link: string
	extractDir: string
	folderName: string
	success: boolean
	failed?: boolean
	errorMessage?: string
	createdAt: number
	updatedAt: number
}

export interface RepoDownloadResult {
	success: boolean
	extractDir?: string
	folderName?: string
	error?: string
}

export interface RepoDeleteResult {
	success: boolean
	error?: string
}
