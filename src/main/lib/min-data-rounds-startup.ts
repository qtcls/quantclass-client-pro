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

function getLocalDateYYYYMMDD(): string {
	const d = new Date()
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, "0")
	const day = String(d.getDate()).padStart(2, "0")
	return `${y}-${m}-${day}`
}

export async function resetMinDataRoundsRunningForToday(): Promise<void> {
	const dbManager = DBManager.getInstance()
	const db = await dbManager.getConnection(["min_data_rounds"])
	if (!db) return

	const today = getLocalDateYYYYMMDD()

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
