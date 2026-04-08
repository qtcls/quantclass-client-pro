/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

// 个股择时时间槽
export type StockTimingTimeSlot = "0930" | "1030" | "1300" | "1400"

// 个股择时原始数据行
export interface StockTimingViewRow {
	trade_date: string
	strategy_name: string
	stock_name: string
	stock_code: string
	offset: string
	ratio: number
	signal: number
	info: string | null
}

export interface StockTimingMatrixRow {
	stockName: string
	stockCode: string
	offset: string
	signals: Record<StockTimingTimeSlot, number | null>
}

// main聚合数据行
export interface StockTimingStrategyBlock {
	strategyName: string
	stocks: StockTimingMatrixRow[]
}

export type StockTimingViewMatrix = StockTimingStrategyBlock[]
