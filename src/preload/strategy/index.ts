/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import { ipcRenderer } from "electron"

export const strategyIPC = {
	// 策略状态可视化
	getStrategyStatus: (date: string) =>
		ipcRenderer.invoke(IPC_CHANNELS.GET_STRATEGY_STATUS, date),
	// 个股择时可视化
	getStockTimingView: (date: string) =>
		ipcRenderer.invoke(IPC_CHANNELS.GET_STOCK_TIMING_VIEW, date),
}
