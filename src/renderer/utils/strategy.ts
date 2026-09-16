/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type {
	PosStrategyType,
	RebTimeConfig,
	SelectStgType,
	StgGroupType,
} from "@/renderer/types/strategy"
import { genPosMgmtStrategyDict, genSelectStrategyDict } from "@/renderer/utils"
import {
	getFusionGroupSubRealMarketStrategyName,
	getFusionTopRealMarketStrategyName,
	getSelectRealMarketStrategyName,
} from "@/shared/lib/real-market-strategy-name"
import { autoTradeTimeByRebTime } from "./trade"

const { setStoreValue } = window.electronAPI

// 写入每个策略的rebalance_time的rebTimeConfig，若rebTime不存在则先创建
const addStrategyToRebTimeConfig = (
	rebTimeConfig: Record<string, RebTimeConfig>,
	rebTime: string,
	strategy: SelectStgType | PosStrategyType,
): void => {
	rebTimeConfig[rebTime] ??= {
		...autoTradeTimeByRebTime(rebTime),
		strategies: [],
	}
	rebTimeConfig[rebTime].strategies.push(strategy)
}

/**
 * 重新生成指定 rebalance_time 的换仓时间
 * @param rebTimeConfig 当前的换仓时间配置
 * @param rebTime 要重新生成的 rebalance_time
 * @returns 更新后的 rebTimeConfig
 */
export const regenerateRebTime = (
	rebTimeConfig: Record<string, RebTimeConfig>,
	rebTime: string,
): Record<string, RebTimeConfig> => {
	const { sell_time, buy_time } = autoTradeTimeByRebTime(rebTime)
	const strategies = rebTimeConfig[rebTime]?.strategies ?? []

	return {
		...rebTimeConfig,
		[rebTime]: {
			sell_time,
			buy_time,
			strategies, // 保留原有的策略列表
		},
	}
}

// -- 处理偏移列表，支持中英文逗号，去重和转换为数字
export const processOffsetList = (offsetListStr: string): number[] => {
	return Array.from(
		new Set(
			offsetListStr
				.replace(/，/g, ",")
				.split(",")
				.map((s) => s.trim().replace(/\s+/g, "")) // -- 处理空格
				.filter((s) => s !== "") // -- 过滤空字符串
				.map(Number), // -- 转换为数字
		),
	).sort((a, b) => a - b) // -- 排序
}

// -- 生成随机交易时间
// export const generateTradeTime = () => {
// 	return {
// 		buy_time: generateRandomTime(9, 24, 50),
// 		sell_time: generateRandomTime(14, 45, 50),
// 		split_order_amount: Math.floor(Math.random() * (12000 - 6000 + 1)) + 6000,
// 	}
// }

const genSelectStgInfo = (strategy: SelectStgType, includeInfo = true) => {
	return {
		name: strategy.name,
		remark_name: strategy.remark_name ?? "",
		cap_weight: strategy.cap_weight,
		hold_period: strategy.hold_period,
		offset_list: strategy.offset_list,
		select_num: Number.parseInt(String(strategy.select_num)),
		factor_list: strategy.factor_list,
		filter_list: strategy.filter_list,
		...(strategy.filter_list_post !== undefined
			? { filter_list_post: strategy.filter_list_post }
			: {}), // -- 后置过滤配置
		...(strategy.cross_sections !== undefined
			? { cross_sections: strategy.cross_sections }
			: {}), // -- 截面因子配置
		...(strategy.stock_timing_list !== undefined
			? { stock_timing_list: strategy.stock_timing_list }
			: {}), // -- 个股择时配置
		rebalance_time: strategy.rebalance_time,
		timing: strategy.timing ?? null,
		scalein_targets: strategy.scalein_targets ?? null,
		override: strategy.override ?? null,
		...(includeInfo ? { info: strategy.info ?? {} } : {}), // -- 根据参数决定是否包含info字段
	}
}

export const saveStrategyList = async (
	strategies: SelectStgType[],
	existingRebTimeConfig?: Record<string, RebTimeConfig>,
) => {
	/**
	 * @description 保存策略列表
	 * @param strategies 策略列表
	 * @param existingRebTimeConfig 已有的换仓时间配置（可选），如果提供则复用已有的时间
	 * @returns { strategyDict, rebTimeConfig }
	 */
	const strategiesWithAdjustedWeight = strategies.map((strategy) => ({
		...strategy,
		calc_time: strategy.calc_time ?? "08:00:00",
	}))

	const rebTimeConfig: Record<string, RebTimeConfig> = {}

	// 如果有已有配置，复用时间但清空策略列表
	if (existingRebTimeConfig) {
		for (const [rebTime, config] of Object.entries(existingRebTimeConfig)) {
			rebTimeConfig[rebTime] = {
				sell_time: config.sell_time,
				buy_time: config.buy_time,
				strategies: [],
			}
		}
	}

	const strategyDict: Record<string, any> = {}
	for (let index = 0; index < strategiesWithAdjustedWeight.length; index++) {
		const strategy = strategiesWithAdjustedWeight[index]
		const rebTime = strategy.rebalance_time ?? "close-open"
		const strategyName =
			strategy.remark_name?.trim() ||
			getSelectRealMarketStrategyName(index, strategy.name)

		addStrategyToRebTimeConfig(rebTimeConfig, rebTime, strategy)

		strategyDict[strategyName] = genSelectStrategyDict(
			strategy as SelectStgType,
			rebTimeConfig[rebTime],
		)
	}

	// 清理不再使用的 rebalance_time 配置
	for (const rebTime of Object.keys(rebTimeConfig)) {
		if (rebTimeConfig[rebTime].strategies.length === 0) {
			delete rebTimeConfig[rebTime]
		}
	}

	// -- 生成策略配置字典，添加index
	// const strategyDict = strategiesWithAdjustedWeight.reduce(
	// 	(acc, item, index) => {
	// 		acc[`#${index}.${item.name}`] = genSelectStrategyDict(
	// 			item as SelectStgType,
	// 		)
	// 		return acc
	// 	},
	// 	{},
	// )
	// -- 生成aqua内核策略列表
	const selectStrategyList = strategiesWithAdjustedWeight.map((stg) =>
		genSelectStgInfo(stg, false),
	)
	await setStoreValue("select_stock.strategy_list", selectStrategyList)

	return { strategyDict, rebTimeConfig }
}

// 仓位管理生成dict
export const saveStrategyListFusion = async (
	fusionStrategies: (SelectStgType | StgGroupType | PosStrategyType)[],
	existingRebTimeConfig?: Record<string, RebTimeConfig>,
) => {
	/**
	 * @description 保存仓位管理策略列表
	 * @param fusionStrategies 策略列表
	 * @param existingRebTimeConfig 已有的换仓时间配置（可选），如果提供则复用已有的时间
	 * @returns { strategyDict, rebTimeConfig }
	 */
	// 深度拷贝输入的策略，避免污染原始数据
	const strategies = JSON.parse(JSON.stringify(fusionStrategies))
	const strategiesWithAdjustedWeight = strategies.map(
		(strategy: SelectStgType | StgGroupType | PosStrategyType) => ({
			...strategy,
		}),
	)

	// -- 生成zeus内核策略列表
	const selectStrategyList = strategiesWithAdjustedWeight.map(
		(stg: SelectStgType | StgGroupType | PosStrategyType) => {
			switch (stg.type) {
				case "pos":
					return {
						name: stg.name,
						remark_name: stg.remark_name ?? "",
						hold_period: stg.hold_period,
						offset_list: stg.offset_list,
						max_select_num: stg.max_select_num ?? 0, // -- 最大选股数量
						rebalance_time: stg.rebalance_time,
						cap_weight: stg.cap_weight,
						params: stg.params,
						strategy_pool: stg.strategy_pool.map((grp_or_stg) =>
							grp_or_stg.type === "group"
								? {
										name: grp_or_stg.name,
										remark_name: grp_or_stg.remark_name ?? "",
										cap_weight: grp_or_stg.cap_weight,
										strategy_list: grp_or_stg.strategy_list.map((_stg) =>
											genSelectStgInfo(_stg as SelectStgType),
										),
									}
								: genSelectStgInfo(grp_or_stg as SelectStgType),
						),
						re_timing: stg.re_timing, // 资金曲线再择时
					}
				case "group":
					return {
						name: stg.name,
						remark_name: stg.remark_name ?? "",
						cap_weight: stg.cap_weight,
						strategy_list: stg.strategy_list.map((_stg) =>
							genSelectStgInfo(_stg as SelectStgType),
						),
						re_timing: stg.re_timing, // 资金曲线再择时
					}
				default:
					return genSelectStgInfo(stg as SelectStgType)
			}
		},
	)
	await setStoreValue("pos_mgmt.strategies", selectStrategyList)

	const rebTimeConfig: Record<string, RebTimeConfig> = {}

	// 如果有已有配置，复用时间但清空策略列表
	if (existingRebTimeConfig) {
		for (const [rebTime, config] of Object.entries(existingRebTimeConfig)) {
			rebTimeConfig[rebTime] = {
				sell_time: config.sell_time,
				buy_time: config.buy_time,
				strategies: [],
			}
		}
	}

	const strategyDict: Record<string, any> = {}
	for (let index = 0; index < strategiesWithAdjustedWeight.length; index++) {
		const strategy = strategiesWithAdjustedWeight[index]
		const strategyName =
			strategy.remark_name?.trim() ||
			getFusionTopRealMarketStrategyName(index, strategy.name)
		if (strategy.type === "pos") {
			const rebTime = strategy.rebalance_time ?? "close-open"

			addStrategyToRebTimeConfig(
				rebTimeConfig,
				rebTime,
				strategy as PosStrategyType,
			)

			strategyDict[strategyName] = genPosMgmtStrategyDict(
				strategy as PosStrategyType,
				rebTimeConfig[rebTime],
			)
		} else if (strategy.type === "group") {
			for (let index0 = 0; index0 < strategy.strategy_list.length; index0++) {
				const subStrategy = strategy.strategy_list[index0]
				const rebTime = subStrategy.rebalance_time ?? "close-open"

				const dictKey =
					subStrategy.remark_name?.trim() ||
					getFusionGroupSubRealMarketStrategyName(
						index,
						strategy.name,
						index0,
						subStrategy.name,
						strategy.strategy_list.length,
					)

				addStrategyToRebTimeConfig(rebTimeConfig, rebTime, subStrategy)

				strategyDict[dictKey] = genSelectStrategyDict(
					{
						...subStrategy,
						cap_weight: subStrategy.cap_weight * (strategy.cap_weight ?? 0),
					},
					rebTimeConfig[rebTime],
				)
			}
		} else {
			const rebTime = strategy.rebalance_time ?? "close-open"

			addStrategyToRebTimeConfig(
				rebTimeConfig,
				rebTime,
				strategy as SelectStgType,
			)

			strategyDict[strategyName] = genSelectStrategyDict(
				strategy,
				rebTimeConfig[rebTime],
			)
		}
	}

	// 清理不再使用的 rebalance_time 配置
	for (const rebTime of Object.keys(rebTimeConfig)) {
		if (rebTimeConfig[rebTime].strategies.length === 0) {
			delete rebTimeConfig[rebTime]
		}
	}
	// -- 生成策略配置字典，添加index
	// const strategyDict = strategiesWithAdjustedWeight.reduce(
	// 	(
	// 		acc: Record<string, any>,
	// 		item: PosStrategyType | SelectStgType | StgGroupType,
	// 		index: number,
	// 	) => {
	// 		const strategyName = `X${index + 1}-${item.name}`

	// 		switch (item.type) {
	// 			case "pos":
	// 				acc[strategyName] = genPosMgmtStrategyDict(item as PosStrategyType)
	// 				break
	// 			case "group":
	// 				if (item.strategy_list.length > 1) {
	// 					item.strategy_list.forEach((curr1, index1) => {
	// 						const key = `${strategyName}#${index1}.${curr1.name}`
	// 						acc[key] = genSelectStrategyDict({
	// 							...curr1,
	// 							cap_weight: (curr1.cap_weight / 100) * (item.cap_weight ?? 0),
	// 						})
	// 					})
	// 				} else {
	// 					acc[strategyName] = genSelectStrategyDict({
	// 						...item.strategy_list[0],
	// 						cap_weight:
	// 							(item.strategy_list[0].cap_weight / 100) *
	// 							(item.cap_weight ?? 0),
	// 					})
	// 				}
	// 				break
	// 			default:
	// 				acc[strategyName] = genSelectStrategyDict({
	// 					...item,
	// 					cap_weight: item.cap_weight ?? 0 / 100,
	// 				})
	// 				break
	// 		}
	// 		return acc
	// 	},
	// 	{},
	// )
	return { strategyDict, rebTimeConfig }
}

// 收集选股策略的 remark_name
export function collectSelectRemarkNames(
	list: SelectStgType[],
	excludeIndex?: number,
): Set<string> {
	const names = new Set<string>()
	for (let i = 0; i < list.length; i++) {
		if (i === excludeIndex) continue
		const rn = list[i].remark_name?.trim()
		if (rn) names.add(rn)
	}
	return names
}

// 收集仓管模式下的remark_name
export function collectFusionRemarkNames(
	fusion: (SelectStgType | StgGroupType | PosStrategyType)[],
	excludeIdentity?: { fusionIndex: number; rowIndex?: number },
): Set<string> {
	const names = new Set<string>()

	for (let i = 0; i < fusion.length; i++) {
		const item = fusion[i] as any
		const isExcludedTop =
			excludeIdentity &&
			excludeIdentity.fusionIndex === i &&
			excludeIdentity.rowIndex === undefined

		if (!isExcludedTop) {
			const rn = item.remark_name?.trim()
			if (rn) names.add(rn)
		}

		if (item.strategy_pool) {
			for (let j = 0; j < item.strategy_pool.length; j++) {
				const poolItem = item.strategy_pool[j]
				const isExcludedChild =
					excludeIdentity &&
					excludeIdentity.fusionIndex === i &&
					excludeIdentity.rowIndex === j
				if (isExcludedChild) continue

				const rn = poolItem.remark_name?.trim()
				if (rn) names.add(rn)

				if (poolItem.strategy_list) {
					for (const sub of poolItem.strategy_list) {
						const subRn = sub.remark_name?.trim()
						if (subRn) names.add(subRn)
					}
				}
			}
		} else if (item.strategy_list) {
			for (let j = 0; j < item.strategy_list.length; j++) {
				const isExcludedChild =
					excludeIdentity &&
					excludeIdentity.fusionIndex === i &&
					excludeIdentity.rowIndex === j
				if (isExcludedChild) continue

				const sub = item.strategy_list[j]
				const rn = sub.remark_name?.trim()
				if (rn) names.add(rn)
			}
		}
	}

	return names
}
