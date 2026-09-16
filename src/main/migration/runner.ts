/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import fs from "node:fs"
import path from "node:path"
import logger from "@/main/utils/wiston.js"
import { app } from "electron"
import Store from "electron-store"
import { migrations } from "./migrations/index.js"

export interface Migration {
	id: string
	description: string
	target: "main" | "renderer"
	up: (store: Store) => void
}

interface MigrationRecord {
	id: string
	description: string
	executed_at: string
	success: boolean
	error: string | null
}

function getMigrationsDir(): string {
	return path.join(app.getPath("userData"), "migrations")
}

function ensureMigrationsDir(): void {
	const dir = getMigrationsDir()
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true })
	}
}

function formatTimestampForFile(date = new Date()): string {
	const pad = (n: number) => String(n).padStart(2, "0")
	return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(
		date.getHours(),
	)}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

function readAllRecords(): MigrationRecord[] {
	const dir = getMigrationsDir()
	if (!fs.existsSync(dir)) return []

	const files = fs.readdirSync(dir).filter((name) => name.endsWith(".json"))
	const records: MigrationRecord[] = []

	for (const file of files) {
		const filePath = path.join(dir, file)
		try {
			const record = JSON.parse(
				fs.readFileSync(filePath, "utf-8"),
			) as MigrationRecord
			if (record?.id) records.push(record)
		} catch (error) {
			logger.warn(`[migration] 读取迁移记录失败，已忽略文件: ${filePath}，错误: ${error}`)
		}
	}

	return records
}

function hasSuccessfulRecord(id: string): boolean {
	return readAllRecords().some((record) => record.id === id && record.success)
}

function writeRecord(record: MigrationRecord): void {
	const fileName = `${formatTimestampForFile()}_${record.id}.json`
	const filePath = path.join(getMigrationsDir(), fileName)
	fs.writeFileSync(filePath, JSON.stringify(record, null, 2))
}

export async function runMigrations(): Promise<void> {
	ensureMigrationsDir()

	const store = new Store()

	for (const migration of migrations) {
		if (migration.target !== "main") continue

		if (hasSuccessfulRecord(migration.id)) continue

		try {
			migration.up(store)
			writeRecord({
				id: migration.id,
				description: migration.description,
				executed_at: new Date().toISOString(),
				success: true,
				error: null,
			})
			logger.info(`[migration] 执行迁移成功: ${migration.id}`)
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			writeRecord({
				id: migration.id,
				description: migration.description,
				executed_at: new Date().toISOString(),
				success: false,
				error: message,
			})
			logger.error(
				`[migration] 执行迁移失败: ${migration.id}，错误信息: ${message}`,
			)
		}
	}
}

export function getPendingRendererMigrations(): string[] {
	ensureMigrationsDir()
	return migrations
		.filter((m) => m.target === "renderer")
		.filter((m) => !hasSuccessfulRecord(m.id))
		.map((m) => m.id)
}

export function markMigrationDone(
	id: string,
	success: boolean,
	error?: string,
): void {
	ensureMigrationsDir()
	const migration = migrations.find((m) => m.id === id)
	writeRecord({
		id,
		description: migration?.description ?? "",
		executed_at: new Date().toISOString(),
		success,
		error: error ?? null,
	})
	if (success) {
		logger.info(`[migration] 执行迁移成功: ${id} (renderer)`)
	} else {
		logger.error(
			`[migration] 执行迁移失败: ${id} (renderer)，错误信息: ${error}`,
		)
	}
}
