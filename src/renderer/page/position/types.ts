/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export type PositionInfoType = {
	策略名称: string
	证券代码: string
	持仓量: number
	交易日期: string
	计划卖出日期: string
	订单标记: string
	上笔委托编号: string
	上笔成交量: number
	成交均价: number
	其他: string
}

export type PositionStockInfoType = {
	策略名称: string
	证券代码: string
	证券名称: string
	持仓量: number
	占比: number
	offset: string
	当日盈亏: number
	当日收益率: number
	累计盈亏: number
	累计收益率: number
	"滑点（‰）": string
}

export type PositionStockSummaryInfoType = {
	证券代码: string
	证券名称: string
	持仓量: number
	占比: number
	当日盈亏: number
	当日收益率: number
	累计盈亏: number
	累计收益率: number
	"滑点（‰）": number | null
}

export type PositionStrategyInfoType = {
	策略名称: string
	理论占比: number
	实际占比: number
	策略仓位: number
	占用资金: number
	当日盈亏: number
	当日收益率: number
}
