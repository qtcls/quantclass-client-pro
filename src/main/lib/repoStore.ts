/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { RepoDownloadRecord } from "@/shared/types/repo.js"
import Store from "electron-store"

export type { RepoApiType, RepoDownloadRecord } from "@/shared/types/repo.js"

const RECORDS_KEY = "records"

class RepoStore {
	private _store = new Store<{ records: RepoDownloadRecord[] }>({
		name: "repo_records",
		defaults: { records: [] },
		clearInvalidConfig: true,
	})

	listRecords(): RepoDownloadRecord[] {
		return (this._store.get(RECORDS_KEY) as RepoDownloadRecord[]) ?? []
	}

	getRecordsByFid(fid: string): RepoDownloadRecord[] {
		return this.listRecords().filter((r) => r.fid === fid)
	}

	appendRecord(record: RepoDownloadRecord): RepoDownloadRecord {
		const records = this.listRecords()
		records.push(record)
		this._store.set(RECORDS_KEY, records)
		return record
	}

	updateRecord(
		ticket: string,
		patch: Partial<RepoDownloadRecord>,
	): RepoDownloadRecord | null {
		let records = this.listRecords()
		const idx = records.findIndex((r) => r.ticket === ticket)
		if (idx === -1) return null

		const updated: RepoDownloadRecord = {
			...records[idx],
			...patch,
			ticket: records[idx].ticket,
			updatedAt: Date.now(),
		}

		if (updated.success && updated.folderName) {
			records = records.filter(
				(r) => r.ticket === ticket || r.folderName !== updated.folderName,
			)
		}

		const newIdx = records.findIndex((r) => r.ticket === ticket)
		if (newIdx === -1) {
			records.push(updated)
		} else {
			records[newIdx] = updated
		}

		this._store.set(RECORDS_KEY, records)
		return updated
	}

	deleteRecordByTicket(ticket: string): RepoDownloadRecord | null {
		const records = this.listRecords()
		const idx = records.findIndex((r) => r.ticket === ticket)
		if (idx === -1) return null

		const [removed] = records.splice(idx, 1)
		this._store.set(RECORDS_KEY, records)
		return removed
	}
}

export const repoStore = new RepoStore()
