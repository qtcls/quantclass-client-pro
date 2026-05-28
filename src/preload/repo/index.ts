/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type {
	RepoApiType,
	RepoDeleteResult,
	RepoDownloadRecord,
	RepoDownloadResult,
} from "@/shared/types/repo.js"
import { ipcRenderer } from "electron"

export const repoIPC = {
	listRepoRecords: (): Promise<RepoDownloadRecord[]> =>
		ipcRenderer.invoke("repo:list-records"),

	appendRepoRecord: (
		record: RepoDownloadRecord,
	): Promise<RepoDownloadRecord | null> =>
		ipcRenderer.invoke("repo:append-record", record),

	updateRepoRecord: (
		ticket: string,
		patch: Partial<RepoDownloadRecord>,
	): Promise<RepoDownloadRecord | null> =>
		ipcRenderer.invoke("repo:update-record", ticket, patch),

	hasRepoSuccessBaseFolderByFid: (
		fid: string,
		baseFolderName: string,
	): Promise<boolean> =>
		ipcRenderer.invoke(
			"repo:has-success-base-folder-by-fid",
			fid,
			baseFolderName,
		),

	downloadAndExtractRepo: (args: {
		link: string
		apiType: RepoApiType
		versionName: string
		overwrite?: boolean
	}): Promise<RepoDownloadResult> =>
		ipcRenderer.invoke("repo:download-and-extract", args),

	deleteRepoDownload: (ticket: string): Promise<RepoDeleteResult> =>
		ipcRenderer.invoke("repo:delete-record", ticket),
}
