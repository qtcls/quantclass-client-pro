/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import DBManager from "@/main/lib/db-manager.js"
import logger from "@/main/utils/wiston.js"
import { getLocalDateYYYYMMDD } from "@/shared/lib/trading-day.js"
import type Database from "better-sqlite3"

function resetRoundsTableRunningForToday(
	db: Database.Database,
	tableName: string,
	today: string,
): void {
	const result = db
		.prepare(`UPDATE ${tableName} SET is_running = 0 WHERE run_date = ?`)
		.run(today)
	if (result.changes > 0) {
		logger.info(
			`[min-data-rounds] 启动重置：已将 ${tableName} 中 ${result.changes} 条今日记录的 is_running 置为 0（run_date=${today}）`,
		)
	}
}

export async function resetMinDataRoundsRunningForToday(): Promise<void> {
	const dbManager = DBManager.getInstance()
	const today = getLocalDateYYYYMMDD()

	const stockDb = await dbManager.getConnection(["min_data_rounds"])
	if (stockDb) {
		try {
			resetRoundsTableRunningForToday(stockDb, "min_data_rounds", today)
		} catch (error) {
			logger.error(
				`[min-data-rounds] 启动重置 min_data_rounds is_running 失败: ${error}`,
			)
		}
	}

	const etfDb = await dbManager.getConnection(["min_data_etf_rounds"])
	if (etfDb) {
		try {
			resetRoundsTableRunningForToday(etfDb, "min_data_etf_rounds", today)
		} catch (error) {
			logger.error(
				`[min-data-rounds] 启动重置 min_data_etf_rounds is_running 失败: ${error}`,
			)
		}
	}
}
