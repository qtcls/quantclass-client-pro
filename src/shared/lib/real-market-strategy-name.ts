/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

/** 选股模式：写入 real_market_25.json 的策略名 */
export function getSelectRealMarketStrategyName(
	index: number,
	name: string,
): string {
	return `#${index}.${name}`
}

/** 仓管模式顶层：写入 real_market_25.json 的策略名 */
export function getFusionTopRealMarketStrategyName(
	index: number,
	name: string,
): string {
	return `X${index + 1}-${name}`
}

/** 仓管 group 子策略：写入 real_market_25.json 的策略名 */
export function getFusionGroupSubRealMarketStrategyName(
	fusionIndex: number,
	groupName: string,
	subIndex: number,
	subName: string,
	subStrategyCount: number,
): string {
	const topName = getFusionTopRealMarketStrategyName(fusionIndex, groupName)
	if (subStrategyCount > 1) {
		return `${topName}#${subIndex}.${subName}`
	}
	return topName
}
