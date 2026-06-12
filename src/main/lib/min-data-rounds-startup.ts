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
import { getLocalCalendarYmd } from "@/shared/lib/trading-day.js"

export async function resetMinDataRoundsRunningForToday(): Promise<void> {
	const dbManager = DBManager.getInstance()
	const db = await dbManager.getConnection(["min_data_rounds"])
	if (!db) return

	const today = getLocalCalendarYmd(new Date())

	try {
		const result = db
			.prepare("UPDATE min_data_rounds SET is_running = 0 WHERE run_date = ?")
			.run(today)
		if (result.changes > 0) {
			logger.info(
				`[min-data-rounds] 启动重置：已将 ${result.changes} 条今日记录的 is_running 置为 0（run_date=${today}）`,
			)
		}
	} catch (error) {
		logger.error(`[min-data-rounds] 启动重置 is_running 失败: ${error}`)
	}
}
