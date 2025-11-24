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
	| "DATA_UPDATE"
	| "SELECT_CLOSE"
	| "SELECT_TIMING_SIG0"
	| "SELECT_TIMING_SIG1"
	| "TRADE_SELL_PLAN"
	| "TRADE_BUY_PLAN"
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
	time: Date | null
}

export interface StrategyStatusStat {
	tag: StrategyStatusTag
	time: [Date, Date | null] | null // 实际执行时间范围 [startTime, endTime]，startTime为开始时间，endTime为结束时间（null表示正在进行中）
	messages: string[]
	batchId?: string //有则是自动增量更新数据  没有则是手动更新
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
