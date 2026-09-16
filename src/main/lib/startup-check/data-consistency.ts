/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { existsSync } from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"
import DBManager from "@/main/lib/db-manager.js"
import {
	isSafeRecycleName,
	writeDataRecycleBin,
} from "@/main/lib/startup-check/data-recycle-bin.js"
import store from "@/main/store/index.js"
import { isKernalBusy } from "@/main/utils/tools.js"
import logger from "@/main/utils/wiston.js"
import type { DataConsistencyReport } from "@/shared/types/startup-check.js"

export type { DataConsistencyReport }

const LOG_PREFIX = "[startup-check/data]"
const WHITE_LIST_KEY = "settings.data_white_list"

function uniqSorted(arr: string[]): string[] {
	return Array.from(new Set(arr)).sort()
}

function diff(a: string[], b: string[]): string[] {
	const bSet = new Set(b)
	return a.filter((x) => !bSet.has(x))
}

interface ProductStatusRow {
	name: string
	full_data: string | null
}

async function readAllProductStatus(): Promise<ProductStatusRow[] | null> {
	const dbManager = DBManager.getInstance()
	const db = await dbManager.getConnection(["product_status"])
	if (!db) {
		logger.warn(`${LOG_PREFIX} 数据库不可用，无法读取 product_status`)
		return null
	}
	try {
		return db
			.prepare(
				"SELECT name, full_data FROM product_status WHERE name IS NOT NULL",
			)
			.all() as ProductStatusRow[]
	} catch (e) {
		logger.error(`${LOG_PREFIX} 查询 product_status 失败: ${e}`)
		return null
	}
}

async function readDiskFoldersForFullData(
	candidates: Set<string>,
): Promise<string[]> {
	const rootPath = await store.getAllDataPath([], false)
	if (!rootPath || !existsSync(rootPath)) {
		logger.warn(`${LOG_PREFIX} 数据根目录不存在: ${rootPath}`)
		return []
	}
	const found: string[] = []
	for (const fullData of candidates) {
		if (!isSafeRecycleName(fullData)) continue
		const dir = path.join(rootPath, fullData)
		try {
			const stat = await fs.stat(dir)
			if (stat.isDirectory()) found.push(fullData)
		} catch {}
	}
	return uniqSorted(found)
}

export async function analyzeDataConsistency(): Promise<DataConsistencyReport> {
	const listSetRaw = (await store.getValue<string[]>(WHITE_LIST_KEY, [])) ?? []
	const listSet = uniqSorted(listSetRaw.filter(Boolean))

	const rowsMaybe = await readAllProductStatus()
	const rows = rowsMaybe ?? []
	const dbSet = uniqSorted(rows.map((r) => r.name).filter(Boolean))

	const candidateFullData = new Set<string>()
	for (const row of rows) {
		if (row.full_data && isSafeRecycleName(row.full_data)) {
			candidateFullData.add(row.full_data)
		}
	}

	const diskSet = uniqSorted(
		await readDiskFoldersForFullData(candidateFullData),
	)

	const onlyDb: string[] = []
	const dataWhiteListA: string[] = []

	for (const row of rows) {
		const productName = row.name
		if (!productName) continue

		const fullData = row.full_data
		if (!fullData || !isSafeRecycleName(fullData)) {
			onlyDb.push(productName)
			continue
		}

		if (diskSet.includes(fullData)) {
			dataWhiteListA.push(productName)
		} else {
			onlyDb.push(productName)
		}
	}

	const dataWhiteListASorted = uniqSorted(dataWhiteListA)
	const aOnly = diff(dataWhiteListASorted, listSet)
	const bOnly = diff(listSet, dataWhiteListASorted)

	await writeDataRecycleBin(aOnly.filter(isSafeRecycleName))

	logger.info(
		`${LOG_PREFIX} analyze: diskFolders=${diskSet.length} dbNames=${dbSet.length} list=${listSet.length} ` +
			`onlyDb=${onlyDb.length} aOnly=${aOnly.length} bOnly=${bOnly.length}`,
	)

	return {
		diskSet,
		dbSet,
		listSet,
		alignedDbDiff: { onlyDb },
		dataWhiteListA: dataWhiteListASorted,
		listDiff: { aOnly, bOnly },
	}
}

// -- 清理 onlyDb：DB 有行但 full_data 目录不存在 → 删 product_status 孤儿行
export async function alignFolderAndDb(
	report: DataConsistencyReport,
): Promise<void> {
	const { onlyDb } = report.alignedDbDiff
	if (onlyDb.length === 0) return

	if (await isKernalBusy("fuel")) {
		throw new Error("fuel 内核正在运行/更新，无法对齐数据库，请稍后重试")
	}

	const dbManager = DBManager.getInstance()
	const db = await dbManager.getConnection(["product_status"])
	if (!db) throw new Error("数据库不可用，无法对齐")

	const stmt = db.prepare("DELETE FROM product_status WHERE name = ?")
	const tx = db.transaction((names: string[]) => {
		for (const n of names) {
			if (!isSafeRecycleName(n)) {
				logger.warn(`${LOG_PREFIX} 跳过不安全 name: ${n}`)
				continue
			}
			stmt.run(n)
		}
	})

	try {
		tx(onlyDb)
		logger.info(
			`${LOG_PREFIX} 已从 product_status 删除 ${onlyDb.length} 行: ${onlyDb.join(", ")}`,
		)
	} catch (e) {
		logger.error(`${LOG_PREFIX} 删除 product_status 失败: ${e}`)
		throw e
	}
}
