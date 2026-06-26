/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { PositionStrategyInfoType } from "@/renderer/page/position/types"

export function isVisibleStrategyPerformance(
	item: PositionStrategyInfoType,
): boolean {
	return (
		(item.理论占比 ?? 0) !== 0 ||
		(item.实际占比 ?? 0) !== 0 ||
		(item.策略仓位 ?? 0) !== 0 ||
		(item.占用资金 ?? 0) !== 0 ||
		(item.当日盈亏 ?? 0) !== 0 ||
		(item.当日收益率 ?? 0) !== 0
	)
}

export function filterVisibleStrategyPerformance(
	data: PositionStrategyInfoType[],
): PositionStrategyInfoType[] {
	return data
		.filter(isVisibleStrategyPerformance)
		.sort((a, b) => (a.策略名称 ?? "").localeCompare(b.策略名称 ?? ""))
}

export function sumStrategyDailyMetrics(data: PositionStrategyInfoType[]) {
	const visible = filterVisibleStrategyPerformance(data)
	const totalPnl = visible.reduce((acc, item) => acc + (item.当日盈亏 ?? 0), 0)
	const totalReturn = visible.reduce(
		(acc, item) => acc + (item.当日收益率 ?? 0),
		0,
	)
	return { totalPnl, totalReturn, count: visible.length }
}
