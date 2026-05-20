/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import fs from "node:fs/promises"
import path from "node:path"
import DBManager from "@/main/lib/db-manager.js"
import store from "@/main/store/index.js"
import { isKernalBusy } from "@/main/utils/tools.js"
import logger from "@/main/utils/wiston.js"
import type { DataRecycleBinEntry } from "@/shared/types/data-recycle-bin.js"

const LOG_PREFIX = "[startup-check/recycle-bin]"
export const DATA_RECYCLE_BIN_KEY = "data_recycle_bin"

const SAFE_NAME_RE = /^[A-Za-z0-9._-]+$/

export function isSafeRecycleName(name: string): boolean {
	if (!name || typeof name !== "string") return false
	if (!SAFE_NAME_RE.test(name)) return false
	return name.startsWith("stock") || name.startsWith("coin")
}

const DATA_PRODUCTS_STATUS_V2_URL =
	"https://quantclass.cn-sh2.ufileos.com/sapi/data/products-status-v2.json"

interface CatalogRecord {
	key: string
	title: string
	fullData: string
	description: string
	course_access?: string[]
}

interface ProductStatusRow {
	name: string
	full_data: string | null
}

function uniqSorted(arr: string[]): string[] {
	return Array.from(new Set(arr)).sort()
}

function normalizeStoredRecycleBin(raw: unknown): DataRecycleBinEntry[] {
	if (!Array.isArray(raw)) return []
	const entries: DataRecycleBinEntry[] = []
	for (const item of raw) {
		if (typeof item === "string" && isSafeRecycleName(item)) {
			entries.push({ name: item, displayName: item })
			continue
		}
		if (
			item &&
			typeof item === "object" &&
			"name" in item &&
			typeof (item as { name: unknown }).name === "string"
		) {
			const name = (item as { name: string }).name
			if (!isSafeRecycleName(name)) continue
			const rawLabel = (item as { displayName?: unknown }).displayName
			const displayName =
				typeof rawLabel === "string" && rawLabel.trim()
					? rawLabel.trim()
					: name
			entries.push({ name, displayName })
		}
	}
	return entries
}

async function resolveDisplayNamesForNames(
	names: string[],
): Promise<DataRecycleBinEntry[]> {
	if (names.length === 0) return []

	let catalog: Map<string, CatalogRecord>
	try {
		catalog = await loadProductCatalogByKey()
	} catch (e) {
		logger.warn(`${LOG_PREFIX} 拉取数据目录失败，displayName 可能不完整: ${e}`)
		catalog = new Map()
	}

	return names.map((name) => {
		const record = catalog.get(name)
		const displayName = record?.description || name
		return { name, displayName }
	})
}

export async function readDataRecycleBin(): Promise<DataRecycleBinEntry[]> {
	const raw = await store.getValue<unknown>(DATA_RECYCLE_BIN_KEY, [])
	return normalizeStoredRecycleBin(raw)
}

export async function writeDataRecycleBin(names: string[]): Promise<void> {
	const safe = uniqSorted(names.filter(isSafeRecycleName))
	const entries = await resolveDisplayNamesForNames(safe)
	await store.setValue(DATA_RECYCLE_BIN_KEY, entries)
	logger.info(`${LOG_PREFIX} 回收站共 ${entries.length} 项`)
}

export async function removeFromRecycleBin(names: string[]): Promise<void> {
	const safe = names.filter(isSafeRecycleName)
	if (safe.length === 0) return
	const removeSet = new Set(safe)
	const next = (await readDataRecycleBin()).filter(
		(item) => !removeSet.has(item.name),
	)
	await store.setValue(DATA_RECYCLE_BIN_KEY, next)
	logger.info(`${LOG_PREFIX} 已从回收站移除 ${safe.length} 项`)
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

function resolveFullDataForName(
	productName: string,
	rows: ProductStatusRow[],
): string | null {
	const row = rows.find((r) => r.name === productName)
	if (row?.full_data && isSafeRecycleName(row.full_data)) return row.full_data
	return null
}

async function deleteDbRows(names: string[]): Promise<void> {
	if (names.length === 0) return
	const dbManager = DBManager.getInstance()
	const db = await dbManager.getConnection(["product_status"])
	if (!db) {
		logger.warn(`${LOG_PREFIX} 数据库不可用，跳过 DB 行删除`)
		return
	}
	const stmt = db.prepare("DELETE FROM product_status WHERE name = ?")
	const tx = db.transaction((rows: string[]) => {
		for (const n of rows) {
			if (!isSafeRecycleName(n)) continue
			stmt.run(n)
		}
	})
	try {
		tx(names)
		logger.info(
			`${LOG_PREFIX} 已删除 product_status ${names.length} 行: ${names.join(", ")}`,
		)
	} catch (e) {
		logger.error(`${LOG_PREFIX} 删除 product_status 失败: ${e}`)
		throw e
	}
}

async function deleteDiskFolderByFullData(fullData: string): Promise<void> {
	if (!isSafeRecycleName(fullData)) {
		logger.warn(`${LOG_PREFIX} 跳过不安全 full_data: ${fullData}`)
		return
	}
	const rootPath = await store.getAllDataPath([], false)
	if (!rootPath) throw new Error("all_data_path 未配置，拒绝删除")
	const normalizedRoot = path.resolve(rootPath)
	const target = path.resolve(normalizedRoot, fullData)
	const relative = path.relative(normalizedRoot, target)
	if (
		!relative ||
		relative.startsWith("..") ||
		path.isAbsolute(relative) ||
		target === normalizedRoot
	) {
		logger.error(`${LOG_PREFIX} 拒绝删除越界路径: ${target}`)
		return
	}
	try {
		logger.info(`${LOG_PREFIX} rm -rf ${target} (full_data=${fullData})`)
		await fs.rm(target, { recursive: true, force: true })
	} catch (e) {
		logger.error(`${LOG_PREFIX} rm 失败 ${target}: ${e}`)
	}
}

async function deleteDiskFoldersForProductNames(
	productNames: string[],
): Promise<void> {
	if (productNames.length === 0) return
	const rows = (await readAllProductStatus()) ?? []
	for (const productName of productNames) {
		const fullData = resolveFullDataForName(productName, rows)
		if (!fullData) {
			logger.warn(
				`${LOG_PREFIX} 无法解析 full_data，跳过磁盘删除 name=${productName}`,
			)
			continue
		}
		await deleteDiskFolderByFullData(fullData)
	}
}

function processDataProductCatalog(data: any[]): CatalogRecord[] {
	const mockData = data
		.map((item) => ({
			key: item.name,
			title: item.displayName,
			fullData: item.fullData,
			description: item.displayName,
			course_access: item.course_access,
		}))
		.filter((item) => item.key && item.key !== "data-api")

	const groupedData = mockData.reduce(
		(acc, item) => {
			const access = Array.isArray(item.course_access)
				? item.course_access[0]?.replace(/['\[\]]/g, "") || "other"
				: item.course_access || "other"
			if (!acc[access]) acc[access] = []
			acc[access].push(item)
			return acc
		},
		{} as Record<string, CatalogRecord[]>,
	)

	return Array.from(
		new Map(
			Object.entries(groupedData)
				.sort(([groupA], [groupB]) => {
					const priority = { coin: 0, stock: 1, fen: 2, other: 3 }
					return (
						(priority[groupA as keyof typeof priority] ?? 99) -
						(priority[groupB as keyof typeof priority] ?? 99)
					)
				})
				.flatMap(([_, items]) => items)
				.map((item) => [item.key, item]),
		).values(),
	)
}

async function loadProductCatalogByKey(): Promise<Map<string, CatalogRecord>> {
	const response = await fetch(DATA_PRODUCTS_STATUS_V2_URL)
	if (!response.ok) {
		throw new Error(
			`拉取数据目录失败: HTTP ${response.status} ${response.statusText}`,
		)
	}
	const json = (await response.json()) as { data?: any[] }
	const list = processDataProductCatalog(json?.data ?? [])
	return new Map(list.map((item) => [item.key, item]))
}

async function purgeLocalData(names: string[]): Promise<void> {
	const safe = names.filter(isSafeRecycleName)
	if (safe.length === 0) return

	if (await isKernalBusy("fuel")) {
		throw new Error("fuel 内核正在运行/更新，物理删除被拒绝，请稍后重试")
	}
	if (safe.length !== names.length) {
		logger.warn(
			`${LOG_PREFIX} 过滤掉 ${names.length - safe.length} 个不安全 name`,
		)
	}
	try {
		await deleteDiskFoldersForProductNames(safe)
	} catch (e) {
		logger.error(`${LOG_PREFIX} 删除磁盘失败: ${e}`)
	}
	try {
		await deleteDbRows(safe)
	} catch (e) {
		logger.error(`${LOG_PREFIX} 删除 DB 失败: ${e}`)
	}
	logger.info(`${LOG_PREFIX} 物理删除完成：${safe.length} 项`)
}

// -- 物理删除磁盘 + product_status，并从回收站移除
export async function purgeDataRecycleBinItems(names: string[]): Promise<void> {
	const safe = names.filter(isSafeRecycleName)
	if (safe.length === 0) return
	await purgeLocalData(safe)
	await removeFromRecycleBin(safe)
	logger.info(`${LOG_PREFIX} 已彻底删除 ${safe.length} 项`)
}
