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
	launchConfigMaster,
	writeFrameworkClientEnv,
} from "@/main/lib/repoManage.js"
import { repoStore } from "@/main/lib/repoStore.js"
import logger from "@/main/utils/wiston.js"
import type { RepoApiType, RepoDownloadRecord } from "@/shared/types/repo.js"
import { ipcMain } from "electron"

function listRecordsHandler(): void {
	ipcMain.handle("repo:list-records", () => {
		try {
			return repoStore.listRecords()
		} catch (error) {
			logger.error(`[repo-ipc] list-records 异常: ${error}`)
			return []
		}
	})
}

function appendRecordHandler(): void {
	ipcMain.handle("repo:append-record", (_event, record: RepoDownloadRecord) => {
		try {
			return repoStore.appendRecord(record)
		} catch (error) {
			logger.error(`[repo-ipc] append-record 异常: ${error}`)
			return null
		}
	})
}

function updateRecordHandler(): void {
	ipcMain.handle(
		"repo:update-record",
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

function hasSuccessBaseFolderByFidHandler(): void {
	ipcMain.handle(
		"repo:has-success-base-folder-by-fid",
		(_event, fid: string, baseFolderName: string) => {
			try {
				return repoStore.hasSuccessBaseFolderByFid(fid, baseFolderName)
			} catch (error) {
				logger.error(`[repo-ipc] has-success-base-folder-by-fid 异常: ${error}`)
				return false
			}
		},
	)
}

function downloadAndExtractHandler(): void {
	ipcMain.handle(
		"repo:download-and-extract",
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
	ipcMain.handle("repo:delete-record", async (_event, ticket: string) => {
		try {
			return await deleteRepoDownload(ticket)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			logger.error(`[repo-ipc] delete-record 异常: ${message}`)
			return { success: false, error: message }
		}
	})
}

function writeFrameworkClientEnvHandler(): void {
	ipcMain.handle("repo:write-framework-client-env", async () => {
		try {
			return await writeFrameworkClientEnv()
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			logger.error(`[repo-ipc] write-framework-client-env 异常: ${message}`)
			return { success: false, error: message }
		}
	})
}

function launchConfigMasterHandler(): void {
	ipcMain.handle(
		"repo:launch-config-master",
		async (
			_event,
			args: {
				configMasterRoot: string
				backtestRoot: string
			},
		) => {
			try {
				return await launchConfigMaster(args)
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error)
				logger.error(`[repo-ipc] launch-config-master 异常: ${message}`)
				return { success: false, error: message }
			}
		},
	)
}

export const regRepoIPC = () => {
	listRecordsHandler()
	appendRecordHandler()
	updateRecordHandler()
	hasSuccessBaseFolderByFidHandler()
	downloadAndExtractHandler()
	deleteRecordHandler()
	writeFrameworkClientEnvHandler()
	launchConfigMasterHandler()
	console.log("[reg] repo-ipc")
}
