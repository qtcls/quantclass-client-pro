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
	deleteRepoDownload,
	downloadAndExtractRepo,
} from "@/main/lib/repoManage.js"
import { repoStore } from "@/main/lib/repoStore.js"
import logger from "@/main/utils/wiston.js"
import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import type {
	RepoApiType,
	RepoDownloadRecord,
} from "@/shared/types/repo.js"
import { ipcMain } from "electron"

function listRecordsHandler(): void {
	ipcMain.handle(IPC_CHANNELS.REPO_LIST_RECORDS, () => {
		try {
			return repoStore.listRecords()
		} catch (error) {
			logger.error(`[repo-ipc] list-records 异常: ${error}`)
			return []
		}
	})
}

function appendRecordHandler(): void {
	ipcMain.handle(
		IPC_CHANNELS.REPO_APPEND_RECORD,
		(_event, record: RepoDownloadRecord) => {
			try {
				return repoStore.appendRecord(record)
			} catch (error) {
				logger.error(`[repo-ipc] append-record 异常: ${error}`)
				return null
			}
		},
	)
}

function updateRecordHandler(): void {
	ipcMain.handle(
		IPC_CHANNELS.REPO_UPDATE_RECORD,
		(_event, ticket: string, patch: Partial<RepoDownloadRecord>) => {
			try {
				return repoStore.updateRecord(ticket, patch)
			} catch (error) {
				logger.error(`[repo-ipc] update-record 异常: ${error}`)
				return null
			}
		},
	)
}

function downloadAndExtractHandler(): void {
	ipcMain.handle(
		IPC_CHANNELS.REPO_DOWNLOAD_AND_EXTRACT,
		async (
			_event,
			args: {
				link: string
				apiType: RepoApiType
				versionName: string
				overwrite?: boolean
			},
		) => {
			try {
				return await downloadAndExtractRepo(args)
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error)
				logger.error(`[repo-ipc] download-and-extract 异常: ${message}`)
				return { success: false, error: message }
			}
		},
	)
}

function deleteRecordHandler(): void {
	ipcMain.handle(IPC_CHANNELS.REPO_DELETE_RECORD, async (_event, ticket: string) => {
		try {
			return await deleteRepoDownload(ticket)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			logger.error(`[repo-ipc] delete-record 异常: ${message}`)
			return { success: false, error: message }
		}
	})
}

export const regRepoIPC = () => {
	listRecordsHandler()
	appendRecordHandler()
	updateRecordHandler()
	downloadAndExtractHandler()
	deleteRecordHandler()
	console.log("[reg] repo-ipc")
}
