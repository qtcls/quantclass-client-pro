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
import store from "@/main/store/index.js"
import logger from "@/main/utils/wiston.js"
import Database from "better-sqlite3"
import { type BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3"
import type { MiddlewareHandler } from "hono"

let db: BetterSQLite3Database | null = null
let dbWatcher: fs.FSWatcher | null = null

export const initDB = async () => {
	try {
		const all_data_path = await store.getSetting("all_data_path", "")
		if (!all_data_path) {
			logger.info("未配置数据路径，跳过数据库初始化")
			return null
		}

		const dbPath = await store.getAllDataPath(
			["code", "data", "FuelBinStat.db"],
			false,
		)
		logger.info(`尝试初始化数据库，路径: ${dbPath}`)

		if (!fs.existsSync(dbPath)) {
			logger.info(`数据库文件不存在: ${dbPath}`)
			// 监听数据库文件夹
			const dbDir = await store.getAllDataPath(["code", "data"], false)
			if (dbWatcher) {
				dbWatcher.close()
			}
			dbWatcher = fs.watch(dbDir, (eventType, filename) => {
				if (eventType === "rename" && filename === "FuelBinStat.db") {
					logger.info("检测到数据库文件创建")
					initDB()
					dbWatcher?.close()
					dbWatcher = null
				}
			})
			return null
		}

		try {
			const sqlite = new Database(dbPath, { verbose: console.log })
			db = drizzle({ client: sqlite })
			logger.info("数据库初始化成功")
			return db
		} catch (sqliteError) {
			logger.error(`SQLite 数据库初始化错误: ${sqliteError}`)
			return null
		}
	} catch (error) {
		logger.error(`数据库初始化失败，详细错误: ${error}`)
		if (error instanceof Error) {
			logger.error(`错误堆栈: ${error.stack}`)
		}
		return null
	}
}

export const DB = (): MiddlewareHandler => {
	const middleware: MiddlewareHandler = async (c, next) => {
		if (!db) {
			db = await initDB()
		}
		c.set("db", db)
		await next()
	}
	return middleware
}

// 清理函数
export const cleanupDB = () => {
	if (dbWatcher) {
		dbWatcher.close()
		dbWatcher = null
	}
	if (db) {
		// @ts-ignore
		db.client.close()
		db = null
	}
}
