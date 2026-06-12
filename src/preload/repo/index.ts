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
import type {
	RepoApiType,
	RepoDeleteResult,
	RepoDownloadRecord,
	RepoDownloadResult,
} from "@/shared/types/repo.js"
import { ipcRenderer } from "electron"

export const repoIPC = {
	listRepoRecords: (): Promise<RepoDownloadRecord[]> =>
		ipcRenderer.invoke(IPC_CHANNELS.REPO_LIST_RECORDS),

	appendRepoRecord: (
		record: RepoDownloadRecord,
	): Promise<RepoDownloadRecord | null> =>
		ipcRenderer.invoke(IPC_CHANNELS.REPO_APPEND_RECORD, record),

	updateRepoRecord: (
		ticket: string,
		patch: Partial<RepoDownloadRecord>,
	): Promise<RepoDownloadRecord | null> =>
		ipcRenderer.invoke(IPC_CHANNELS.REPO_UPDATE_RECORD, ticket, patch),

	downloadAndExtractRepo: (args: {
		link: string
		apiType: RepoApiType
		versionName: string
		overwrite?: boolean
	}): Promise<RepoDownloadResult> =>
		ipcRenderer.invoke(IPC_CHANNELS.REPO_DOWNLOAD_AND_EXTRACT, args),

	deleteRepoDownload: (ticket: string): Promise<RepoDeleteResult> =>
		ipcRenderer.invoke(IPC_CHANNELS.REPO_DELETE_RECORD, ticket),
}
