/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { getStrategyStatusList } from "@/main/core/strategy.js"
import logger from "@/main/utils/wiston.js"
import { ipcMain } from "electron"

async function handleGetStrategyStatus() {
	ipcMain.handle("get-strategy-status", async (_event, date: string) => {
		try {
			logger.info(`[ipc] get-strategy-status for date: ${date}`)
			const statusList = await getStrategyStatusList(date)
			return {
				status: "success",
				data: statusList,
			}
		} catch (error) {
			logger.error(`[ipc] get-strategy-status error: ${error}`)
			return {
				status: "error",
				message: String(error),
				data: [],
			}
		}
	})
}

export const regStrategyIPC = () => {
	handleGetStrategyStatus()
}
