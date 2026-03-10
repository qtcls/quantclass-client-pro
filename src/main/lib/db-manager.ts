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

/**
 * SQLite 连接管理器（单例）
 *
 * 维护一个长连接，每次 getConnection 时做预检查：
 * - DB 文件是否存在
 * - inode 是否一致（检测文件被删后重建）
 * - 连接是否健康（SELECT 1）
 * - 指定的表是否存在
 */
class DBManager {
	private static instance: DBManager
	private db: Database.Database | null = null
	private dbIno: number | bigint | null = null

	private constructor() {}

	static getInstance(): DBManager {
		if (!DBManager.instance) {
			DBManager.instance = new DBManager()
		}
		return DBManager.instance
	}

	/**
	 * 获取数据库连接，带预检查
	 * @param requiredTables 需要检查是否存在的表名列表，缺表时返回 null（不关连接）
	 * @returns 可用的 Database 连接，或 null（DB 不可用）
	 */
	async getConnection(
		requiredTables?: string[],
	): Promise<Database.Database | null> {
		const dbPath = await store.getAllDataPath(
			["code", "data", "FuelBinStat.db"],
			false,
		)

		if (!fs.existsSync(dbPath)) {
			logger.warn(`[DBManager] 数据库文件不存在: ${dbPath}`)
			this.close()
			return null
		}

		let stat: fs.Stats
		try {
			stat = fs.statSync(dbPath)
		} catch {
			logger.warn(`[DBManager] 无法读取数据库文件信息: ${dbPath}`)
			this.close()
			return null
		}

		// inode 变化 → 文件被替换，旧连接失效
		if (this.db && this.dbIno !== stat.ino) {
			logger.info(
				"[DBManager] 检测到数据库文件已被替换（inode 变化），重建连接",
			)
			this.close()
		}

		// 现有连接健康检查
		if (this.db) {
			try {
				this.db.prepare("SELECT 1").get()
			} catch {
				logger.warn("[DBManager] 现有连接不健康，重建连接")
				this.close()
			}
		}

		// 需要创建新连接
		if (!this.db) {
			try {
				this.db = new Database(dbPath)
				this.dbIno = stat.ino
				logger.info(`[DBManager] 数据库连接已建立: ${dbPath}`)
			} catch (error) {
				logger.error(`[DBManager] 创建数据库连接失败: ${error}`)
				this.db = null
				this.dbIno = null
				return null
			}
		}

		// 检查必需的表是否存在
		if (requiredTables?.length) {
			for (const table of requiredTables) {
				const row = this.db
					.prepare(
						"SELECT name FROM sqlite_master WHERE type='table' AND name=?",
					)
					.get(table) as { name: string } | undefined
				if (!row) {
					logger.warn(`[DBManager] 所需的表不存在: ${table}`)
					return null
				}
			}
		}

		return this.db
	}

	close(): void {
		if (this.db) {
			try {
				this.db.close()
			} catch (error) {
				logger.warn(`[DBManager] 关闭数据库连接时出错: ${error}`)
			}
			this.db = null
			this.dbIno = null
			logger.info("[DBManager] 数据库连接已关闭")
		}
	}
}

export default DBManager
