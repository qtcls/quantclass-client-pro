/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export type StrategyStatusTag =
	| "MARKET_CLOSE"
	| "DATA_UPDATE"
	| "SELECT_STOCK"
	| "ROCKET_INIT"
	| "PRE_SELL"
	| "QMT_DATA_FUZZY"
	| "QMT_DATA"
	| "SINGAL_FUZZY"
	| "SIGNAL"
	| "TRADING_PLAN"
	| "SELL"
	| "BUY"

export enum StrategyStatusEnum {
	COMPLETED = "completed", // 已完成
	INCOMPLETE = "incomplete", // 未完成（超过预期时间但未完成）
	IN_PROGRESS = "in_progress", // 进行中（在预期时间范围内）
	PENDING = "pending", // 未到预期时间
}

export enum StrategyStatusLabelEnum {
	completed = "已完成",
	incomplete = "未完成",
	in_progress = "进行中",
	pending = "未到预期时间",
}

export interface StrategyStatusPlan {
	time: Date | null | [Date, Date] // 单个时间或时间范围
	timeDes: string
}

export interface StrategyStatusStat {
	time: Date | null | [Date, Date] // 单个时间或时间范围，与 plan 保持一致
	timeDes: string
	messages: string[]
}

export interface StrategyStatus {
	strategyName: string
	tag: StrategyStatusTag
	title: string
	description: string
	status: StrategyStatusEnum
	plan: StrategyStatusPlan
	stat?: StrategyStatusStat
	stats?: StrategyStatusStat[]
}
