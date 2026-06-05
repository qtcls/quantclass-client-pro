/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export interface BuyTableRef {
	refresh: () => void
}

export interface BuyRoot {
	offset: string
	交易日期: number
	其他: string
	分配金额?: number
	委托编号?: string
	成交均价?: number
	是否下单: string
	策略名称: string
	订单标记: string
	证券代码: string
	预计交易时间: string
	个股择时?: "是" | "否"
}

export interface SellTableRef {
	refresh: () => void
}

export interface SellRoot {
	交易日期: number
	策略名称: string
	卖出数量: number
	证券代码: string
	其他: string
	预计交易时间: string
	是否下单: string
	委托编号?: string
	订单标记: string
	个股择时?: "是" | "否"
}
