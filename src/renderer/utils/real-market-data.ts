/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

/**
 * 由策略字典构造 real_market_25.json 的落盘数据（纯函数，唯一构造点）。
 *
 * 内核（rocket）经 ROCKET_STR_INFO_PATH 读 real_market_25.json：键为 `strategy_${index}`，
 * 值为策略实盘配置 + `name`（原 dict 键）。末尾恒附「非策略选股」占位项。
 *
 * ⚠️ 只 reshape 已算好的 `strategyDict`/`nonStrategyConfig`，**绝不调用 genSelectStrategyDict 等
 * builder**——后者含 Math.random（买入间隔/拆单金额/非策略买卖秒），重算会二次随机化，
 * 导致同一批策略落盘内容与 selectStgDict atom 漂移。调用方须传入本次 sync 函数 /
 * saveStrategyList 系列已生成的那一份 dict，保证 enable 落盘与 UI 投影一致。
 *
 * 本函数确定性、无副作用、无宿主依赖，可被防抖、enable-flush、换仓时间 modal 共用并单测。
 */
export function buildRealMarketData(
	strategyDict: Record<string, any>,
	nonStrategyConfig: Record<string, any>,
): Record<string, any> {
	const parsedData: Record<string, any> = {}
	Object.entries({
		...(strategyDict ?? {}),
		非策略选股: nonStrategyConfig,
	}).forEach(([key, value], index) => {
		parsedData[`strategy_${index}`] = { ...(value ?? {}), name: key }
	})
	return parsedData
}
