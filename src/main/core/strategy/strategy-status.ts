/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { getJsonDataFromFile } from "@/main/core/dataList.js"
import store, { rStore } from "@/main/store/index.js"
import logger from "@/main/utils/wiston.js"
import { ROCKET_STATS_PATH, SELECT_STATS_PATH } from "@/main/vars.js"
import type {
	StrategyStatus,
	StrategyStatusStat,
} from "@/shared/types/strategy-status.js"
import { StrategyStatusEnum } from "@/shared/types/strategy-status.js"
import { sortBy } from "lodash-es"

// 从 JSON 文件读取 stats 数据
// kernel: 'fuel' | 'aqua' | 'zeus' | 'rocket'
async function readStatsFromJson(
	date: string,
	kernel: string,
	strategyName?: string,
): Promise<StrategyStatusStat[]> {
	try {
		const fileName = `${kernel}-stats-${date}.json`
		const filePath =
			kernel === "rocket"
				? [...ROCKET_STATS_PATH, fileName]
				: [...SELECT_STATS_PATH, fileName]

		const data = await getJsonDataFromFile<{ stats?: any[] }>(
			filePath,
			`读取stats文件失败: ${filePath.join("/")}`,
			{},
		)

		if (!data.stats || !Array.isArray(data.stats)) {
			return []
		}

		// 按策略名筛选出 stats
		// SELECT_CLOSE 这个tag始终包含，其他tag按策略名筛选
		let filteredStats = data.stats
		if (strategyName) {
			filteredStats = data.stats.filter(
				(stat: any) =>
					stat.tag === "SELECT_CLOSE" || stat.strategy === strategyName,
			)
		}

		const stats: StrategyStatusStat[] = filteredStats.map((stat: any) => {
			let time: [Date, Date | null] | null = null
			if (stat.time) {
				if (Array.isArray(stat.time)) {
					// 时间范围 [startTime, endTime]
					const startTime = new Date(stat.time[0])
					const endTime = stat.time[1] ? new Date(stat.time[1]) : null
					time = [startTime, endTime]
				} else {
					// 如果是单个时间，转换为时间范围 [time, null]（兼容json文件里返回单个时间格式）
					const startTime = new Date(stat.time)
					time = [startTime, null]
				}
			}

			return {
				tag: stat.tag || "",
				time,
				timeDes: stat.timeDes || "",
				messages: Array.isArray(stat.messages) ? stat.messages : [],
				...(stat.batchId && { batchId: stat.batchId }),
			}
		})

		return stats
	} catch (error) {
		return []
	}
}

async function detectSelectKernel(date: string): Promise<"aqua" | "zeus"> {
	const aquaPath = [...SELECT_STATS_PATH, `aqua-stats-${date}.json`]
	const aquaData = await getJsonDataFromFile<{ stats?: any[] }>(
		aquaPath,
		"",
		{},
	)
	if (aquaData.stats && Array.isArray(aquaData.stats)) {
		return "aqua"
	}

	return "zeus"
}

// 获取策略的 timing 和 override 最晚时间
function getStrategyTiming(strategy: any): {
	latestTime: string
	hasTimingOrOverride: boolean
} {
	const times: string[] = []
	let hasTiming = false
	let hasOverride = false

	if (strategy.timing?.factor_list) {
		hasTiming = true
		for (const factor of strategy.timing.factor_list) {
			if (Array.isArray(factor) && factor.length > 0) {
				const lastElement = factor[factor.length - 1]
				if (typeof lastElement === "string" && /^\d{4}$/.test(lastElement)) {
					times.push(lastElement)
				}
			}
		}
	}

	if (strategy.override?.factor_list) {
		hasOverride = true
		for (const factor of strategy.override.factor_list) {
			if (Array.isArray(factor) && factor.length > 0) {
				const lastElement = factor[factor.length - 1]
				if (typeof lastElement === "string" && /^\d{4}$/.test(lastElement)) {
					times.push(lastElement)
				}
			}
		}
	}

	const hasTimingOrOverride = hasTiming || hasOverride
	const latestTime = times.length > 0 ? times.sort().pop() || "" : ""

	return { latestTime, hasTimingOrOverride }
}

/**
 * 将时间字符串转换为Date对象
 * @param timeStr 时间字符串，如 "0945" (HHMM) 或 "094530" (HHMMSS)
 * @param date 日期字符串，格式为 YYYY-MM-DD
 * @param dayOffset 天数偏移，0为当天，-1为前一天，1为后一天
 */
function parseTimeToDate(
	timeStr: string,
	date: string,
	dayOffset = 0,
): Date | null {
	if (!timeStr) {
		return null
	}

	let hour: number
	let minute: number
	let second = 0

	if (/^\d{4}$/.test(timeStr)) {
		// HHMM格式
		hour = Number.parseInt(timeStr.substring(0, 2), 10)
		minute = Number.parseInt(timeStr.substring(2, 4), 10)
	} else if (/^\d{6}$/.test(timeStr)) {
		// HHMMSS格式
		hour = Number.parseInt(timeStr.substring(0, 2), 10)
		minute = Number.parseInt(timeStr.substring(2, 4), 10)
		second = Number.parseInt(timeStr.substring(4, 6), 10)
	} else {
		return null
	}

	const base = new Date(date)
	const result = new Date(
		base.getFullYear(),
		base.getMonth(),
		base.getDate() + dayOffset,
		hour,
		minute,
		second,
	)

	return result
}

// 根据计划时间和实际执行时间判断状态
// planTime: 计划时间（单个时间点）
// stat.time: 实际执行时间范围 [startTime, endTime | null]
// deadlineTime: 截止时间（下一个状态的计划开始时间）
// strictMatch: 只有实盘卖出和买入需要严格匹配时间
function determineStatus(
	planTime: Date | null,
	deadlineTime: Date | null,
	stat?: StrategyStatusStat,
	strictMatch = false,
): StrategyStatusEnum {
	// 如果没有计划时间，默认为pending
	if (!planTime) {
		return StrategyStatusEnum.PENDING
	}

	const now = new Date()

	// 如果还没有实际执行时间（还未开始）
	if (!stat?.time) {
		// 如果当前时间还未到计划时间，状态为pending
		if (now < planTime) {
			return StrategyStatusEnum.PENDING
		}
		// 如果当前时间已过计划时间但还未执行
		if (deadlineTime && now > deadlineTime) {
			return StrategyStatusEnum.INCOMPLETE
		}
		return StrategyStatusEnum.PENDING
	}

	const [statStartTime, statEndTime] = stat.time

	// 如果是实盘卖出和买入
	if (strictMatch) {
		if (statStartTime.getTime() <= planTime.getTime()) {
			// 如果还未结束，则进行中
			if (!statEndTime) {
				return StrategyStatusEnum.IN_PROGRESS
			}

			// 如果已结束，检查结束时间是否超过计划时间20分钟
			const twentyMinutesInMs = 20 * 60 * 1000
			if (statEndTime.getTime() > planTime.getTime() + twentyMinutesInMs) {
				return StrategyStatusEnum.INCOMPLETE
			}

			return StrategyStatusEnum.COMPLETED
		}

		// 如果开始时间晚于计划时间，则异常
		return StrategyStatusEnum.INCOMPLETE
	}

	// 检查开始时间是否超过截止时间（除实盘卖出和买入外的其他状态）
	if (deadlineTime && statStartTime > deadlineTime) {
		return StrategyStatusEnum.INCOMPLETE
	}

	// 如果 stat 正在进行中（没有结束时间）
	if (!statEndTime) {
		return StrategyStatusEnum.IN_PROGRESS
	}

	// 检查结束时间是否超过截止时间（除实盘卖出和买入外的其他状态）
	if (deadlineTime && statEndTime > deadlineTime) {
		return StrategyStatusEnum.INCOMPLETE
	}

	return StrategyStatusEnum.COMPLETED
}

// 生成单个策略的状态列表
async function generateSingleStrategyStatus(
	strategyName: string,
	latestTiming: string,
	hasTimingOrOverride: boolean,
	sellTimeStr: string,
	buyTimeStr: string,
	date: string,
	isOvernightRebalance: boolean, // 是否隔日换仓
	isStrategyPool = false, // 是否为 pos 类型策略
): Promise<StrategyStatus[]> {
	const selectKernel = await detectSelectKernel(date)

	// const fuelStats = await readStatsFromJson(date, "fuel")
	const selectStats = await readStatsFromJson(date, selectKernel, strategyName)
	const rocketStats = await readStatsFromJson(date, "rocket", strategyName)

	const sellDayOffset = isOvernightRebalance ? -1 : 0

	// 从卖出时间推算交易计划生成时间（卖出前2分钟）
	const sellTime = parseTimeToDate(
		sellTimeStr.replace(/:/g, ""),
		date,
		sellDayOffset,
	)
	const tradingPlanTime = sellTime
		? new Date(sellTime.getTime() - 2 * 60 * 1000)
		: null

	const qmtDataTime = isStrategyPool
		? tradingPlanTime
		: parseTimeToDate(latestTiming, date)
			? new Date(parseTimeToDate(latestTiming, date)!.getTime() + 80 * 1000)
			: null

	// DATA_UPDATE: 前一天16:00，截止时间为前一天22:00
	// const dataUpdateTime = parseTimeToDate("1600", date, -1)
	// const dataUpdateDeadline = parseTimeToDate("2200", date, -1)

	// SELECT_CLOSE: 前一天15:00，截止时间为第二天9:00
	const selectCloseTime = parseTimeToDate("1500", date, -1)
	const selectCloseDeadline = parseTimeToDate("0900", date)

	// 当天的买入时间
	const buyTime = parseTimeToDate(buyTimeStr.replace(/:/g, ""), date)

	const findStatsByTag = (stats: StrategyStatusStat[], tag: string) => {
		return stats.filter((stat) => stat.tag === tag)
	}

	const findLatestStatByTag = (stats: StrategyStatusStat[], tag: string) => {
		const matchingStats = findStatsByTag(stats, tag)
		return matchingStats.length > 0
			? matchingStats[matchingStats.length - 1]
			: undefined
	}

	// 整合 SELECT_TIMING_SIG0 的 stats
	const mergeTimingSig0Stats = () => {
		const rocketDataStats = findStatsByTag(
			rocketStats,
			"SELECT_TIMING_SIG0_DATA",
		)
		const selectSigStats = findStatsByTag(selectStats, "SELECT_TIMING_SIG0")
		return [...rocketDataStats, ...selectSigStats]
	}

	// 整合 SELECT_TIMING_SIG1 的 stats
	const mergeTimingSig1Stats = () => {
		const rocketDataStats = findStatsByTag(
			rocketStats,
			"SELECT_TIMING_SIG1_DATA",
		)
		const selectSigStats = findStatsByTag(selectStats, "SELECT_TIMING_SIG1")
		return [...rocketDataStats, ...selectSigStats]
	}

	const timingSig0Stats = mergeTimingSig0Stats()
	const timingSig1Stats = mergeTimingSig1Stats()

	const statusList: StrategyStatus[] = [
		// {
		// 	strategyName,
		// 	tag: "DATA_UPDATE",
		// 	title: "历史数据更新",
		// 	description: "更新历史行情数据",
		// 	status: determineStatus(
		// 		dataUpdateTime,
		// 		dataUpdateDeadline,
		// 		findLatestStatByTag("DATA_UPDATE"),
		// 	),
		// 	plan: {
		// 		time: dataUpdateTime,
		// 	},
		// 	stat: findLatestStatByTag("DATA_UPDATE"),
		// 	stats: findStatsByTag("DATA_UPDATE"),
		// },
		{
			strategyName,
			tag: "SELECT_CLOSE",
			title: "选股",
			description: "基于收盘数据生成选股结果",
			status: determineStatus(
				selectCloseTime,
				selectCloseDeadline,
				findLatestStatByTag(selectStats, "SELECT_CLOSE"),
			),
			plan: {
				time: selectCloseTime,
			},
			stat: findLatestStatByTag(selectStats, "SELECT_CLOSE"),
			stats: findStatsByTag(selectStats, "SELECT_CLOSE"),
		},
	]

	// 只有当存在 timing 或 override 时，添加择时信号状态
	if (hasTimingOrOverride) {
		statusList.push(
			{
				strategyName,
				tag: "SELECT_TIMING_SIG0",
				title: "计算模糊择时信号",
				description: "计算模糊择时信号",
				status: determineStatus(
					qmtDataTime,
					tradingPlanTime,
					timingSig0Stats.length > 0
						? timingSig0Stats[timingSig0Stats.length - 1]
						: undefined,
				),
				plan: {
					time: qmtDataTime,
				},
				stat:
					timingSig0Stats.length > 0
						? timingSig0Stats[timingSig0Stats.length - 1]
						: undefined,
				stats: timingSig0Stats,
				isStrategyPool,
			},
			{
				strategyName,
				tag: "SELECT_TIMING_SIG1",
				title: "计算精确择时信号",
				description: "计算精确择时信号",
				status: determineStatus(
					qmtDataTime,
					tradingPlanTime,
					timingSig1Stats.length > 0
						? timingSig1Stats[timingSig1Stats.length - 1]
						: undefined,
				),
				plan: {
					time: qmtDataTime,
				},
				stat:
					timingSig1Stats.length > 0
						? timingSig1Stats[timingSig1Stats.length - 1]
						: undefined,
				stats: timingSig1Stats,
				isStrategyPool,
			},
		)
	}

	statusList.push(
		{
			strategyName,
			tag: "TRADE_SELL_PLAN",
			title: "生成卖出计划",
			description: "在卖出时间前2分钟生成卖出计划",
			status: determineStatus(
				tradingPlanTime,
				sellTime,
				findLatestStatByTag(rocketStats, "TRADE_SELL_PLAN"),
			),
			plan: {
				time: tradingPlanTime,
			},
			stat: findLatestStatByTag(rocketStats, "TRADE_SELL_PLAN"),
			stats: findStatsByTag(rocketStats, "TRADE_SELL_PLAN"),
		},
		{
			strategyName,
			tag: "TRADE_BUY_PLAN",
			title: "生成买入计划",
			description: "在卖出时间前2分钟生成买入计划",
			status: determineStatus(
				tradingPlanTime,
				sellTime,
				findLatestStatByTag(rocketStats, "TRADE_BUY_PLAN"),
			),
			plan: {
				time: tradingPlanTime,
			},
			stat: findLatestStatByTag(rocketStats, "TRADE_BUY_PLAN"),
			stats: findStatsByTag(rocketStats, "TRADE_BUY_PLAN"),
		},
		{
			strategyName,
			tag: "TRADE_SELL",
			title: "实盘卖出",
			description: "执行实盘卖出操作",
			status: determineStatus(
				sellTime,
				sellTime,
				findLatestStatByTag(rocketStats, "TRADE_SELL"),
				true, // 严格匹配时间
			),
			plan: {
				time: sellTime,
			},
			stat: findLatestStatByTag(rocketStats, "TRADE_SELL"),
			stats: findStatsByTag(rocketStats, "TRADE_SELL"),
		},
		{
			strategyName,
			tag: "TRADE_BUY",
			title: "实盘买入",
			description: "执行实盘买入操作",
			status: determineStatus(
				buyTime,
				buyTime,
				findLatestStatByTag(rocketStats, "TRADE_BUY"),
				true, // 严格匹配时间
			),
			plan: {
				time: buyTime,
			},
			stat: findLatestStatByTag(rocketStats, "TRADE_BUY"),
			stats: findStatsByTag(rocketStats, "TRADE_BUY"),
		},
	)

	return sortBy(statusList, (s) => {
		const t = s.plan.time
		// time 为 null，排在最后
		return t ? t.getTime() : Number.POSITIVE_INFINITY
	})
}

/**
 * 生成策略状态列表（二维数组）
 * 根据 libraryType 选择对应的状态列表函数
 */
export async function getStrategyStatusList(
	date: string,
): Promise<StrategyStatus[][]> {
	try {
		const libraryType = (await store.getValue(
			"settings.libraryType",
			"select",
		)) as string

		if (libraryType === "pos") {
			return await getStrategyStatusListForPos(date)
		}

		return await getStrategyStatusListForSelect(date)
	} catch (error) {
		logger.error(`[strategy-status] 生成策略状态列表失败: ${error}`)
		return []
	}
}

// 选股模式状态列表函数
async function getStrategyStatusListForSelect(
	date: string,
): Promise<StrategyStatus[][]> {
	try {
		const strategyList = (await store.getValue(
			"select_stock.strategy_list",
			[],
		)) as any[]

		if (strategyList.length === 0) {
			logger.warn("[strategy-status] strategy_list 为空")
			return []
		}

		// 读取 real_market_25.json 获取每个策略的买入/卖出时间
		const result: StrategyStatus[][] = await Promise.all(
			strategyList.map(async (strategy: any, index: number) => {
				const strategyKey = `strategy_${index}`
				const strategyConfig = rStore.get(strategyKey) as any

				const strategyName = strategyConfig?.name ?? ""

				const sellTimeStr = strategyConfig?.sell?.[1] ?? ""
				const buyTimeStr = strategyConfig?.buy?.[1] ?? ""

				const { latestTime, hasTimingOrOverride } = getStrategyTiming(strategy)

				// rebalance_time 为 "close-open" 或不存在时，为隔日换仓，其他值则为当日换仓
				const rebalanceTime = strategy.rebalance_time
				const isOvernightRebalance =
					!rebalanceTime || rebalanceTime === "close-open"

				logger.info(
					`[strategy-status] 策略 ${index}(${strategyName}): 卖出时间=${sellTimeStr}, 买入时间=${buyTimeStr}, timing时间=${latestTime}, hasTimingOrOverride=${hasTimingOrOverride}, rebalance_time=${rebalanceTime}, isOvernightRebalance=${isOvernightRebalance}`,
				)

				return await generateSingleStrategyStatus(
					strategyName,
					latestTime,
					hasTimingOrOverride,
					sellTimeStr,
					buyTimeStr,
					date,
					isOvernightRebalance,
					false,
				)
			}),
		)

		logger.info(
			`[strategy-status] 生成了 ${strategyList.length} 个策略的状态列表`,
		)

		return result
	} catch (error) {
		logger.error(`[strategy-status] 生成select策略状态列表失败: ${error}`)
		return []
	}
}

// 仓管模式状态列表函数
async function getStrategyStatusListForPos(
	date: string,
): Promise<StrategyStatus[][]> {
	try {
		const posMgmtStrategies = (await store.getValue(
			"pos_mgmt.strategies",
			[],
		)) as any[]

		if (posMgmtStrategies.length === 0) {
			logger.warn("[strategy-status] pos_mgmt.strategies 为空")
			return []
		}

		// 通过 strategyName 去real_market_25.json筛选对应策略
		const findStrategyConfigByName = (strategyName: string): any => {
			for (const [, config] of Object.entries(rStore.store)) {
				if ((config as any)?.name === strategyName) {
					return config
				}
			}
			return null
		}

		interface PosStrategy {
			name: string
			latestTime: string
			hasTimingOrOverride: boolean
			sellTimeStr: string
			buyTimeStr: string
			rebalanceTime: string
			isOvernightRebalance: boolean
			isStrategyPool?: boolean
		}

		const posStrategies: PosStrategy[] = []

		for (let index = 0; index < posMgmtStrategies.length; index++) {
			const strategy = posMgmtStrategies[index]
			const strategyName = `X${index + 1}-${strategy.name}`

			const type: "pos" | "group" | "select" =
				strategy.strategy_pool && Array.isArray(strategy.strategy_pool)
					? "pos"
					: strategy.strategy_list && Array.isArray(strategy.strategy_list)
						? "group"
						: "select"

			if (type === "pos") {
				// pos 类型：只生成一个元素
				const strategyConfig = findStrategyConfigByName(strategyName)

				const sellTimeStr = strategyConfig?.sell?.[1] ?? ""
				const buyTimeStr = strategyConfig?.buy?.[1] ?? ""

				// 检查 strategy_pool 中是否有任何子策略包含 timing 或 override
				let posHasTimingOrOverride = false
				const strategyPool = strategy.strategy_pool || []
				for (const poolItem of strategyPool) {
					// poolItem 可能是 group 或 select
					if (poolItem.strategy_list && Array.isArray(poolItem.strategy_list)) {
						// 是 group，检查其子策略
						for (const subStg of poolItem.strategy_list) {
							const { hasTimingOrOverride } = getStrategyTiming(subStg)
							if (hasTimingOrOverride) {
								posHasTimingOrOverride = true
								break
							}
						}
					} else {
						// 是 select
						const { hasTimingOrOverride } = getStrategyTiming(poolItem)
						if (hasTimingOrOverride) {
							posHasTimingOrOverride = true
							break
						}
					}
					if (posHasTimingOrOverride) break
				}

				const rebalanceTime = strategy.rebalance_time
				const isOvernightRebalance =
					!rebalanceTime || rebalanceTime === "close-open"

				posStrategies.push({
					name: strategyName,
					latestTime: "",
					hasTimingOrOverride: posHasTimingOrOverride,
					sellTimeStr,
					buyTimeStr,
					rebalanceTime,
					isOvernightRebalance,
					isStrategyPool: true, // 标记为 pos 类型
				})

				logger.info(
					`[strategy-status] pos策略 ${index}(${strategyName}): 卖出时间=${sellTimeStr}, 买入时间=${buyTimeStr}, posHasTimingOrOverride=${posHasTimingOrOverride}, isStrategyPool=true`,
				)
			} else if (type === "group") {
				// group 类型：展开 strategy_list
				const subStrategies = strategy.strategy_list

				for (let index0 = 0; index0 < subStrategies.length; index0++) {
					const subStrategy = subStrategies[index0]

					const dictKey =
						subStrategies.length > 1
							? `${strategyName}#${index0}.${subStrategy.name}`
							: strategyName

					const strategyConfig = findStrategyConfigByName(dictKey)

					const sellTimeStr = strategyConfig?.sell?.[1] ?? ""
					const buyTimeStr = strategyConfig?.buy?.[1] ?? ""

					const { latestTime, hasTimingOrOverride } =
						getStrategyTiming(subStrategy)

					posStrategies.push({
						name: dictKey,
						latestTime,
						hasTimingOrOverride,
						sellTimeStr,
						buyTimeStr,
						rebalanceTime: subStrategy.rebalance_time,
						isOvernightRebalance:
							!subStrategy.rebalance_time ||
							subStrategy.rebalance_time === "close-open",
					})

					logger.info(
						`[strategy-status] group子策略 ${index}.${index0}(${dictKey}): 卖出时间=${sellTimeStr}, 买入时间=${buyTimeStr}, timing时间=${latestTime}, hasTimingOrOverride=${hasTimingOrOverride}`,
					)
				}
			} else {
				// select 类型：单个策略
				const strategyConfig = findStrategyConfigByName(strategyName)

				const sellTimeStr = strategyConfig?.sell?.[1] ?? ""
				const buyTimeStr = strategyConfig?.buy?.[1] ?? ""

				const { latestTime, hasTimingOrOverride } = getStrategyTiming(strategy)
				const rebalanceTime = strategy.rebalance_time
				const isOvernightRebalance =
					!rebalanceTime || rebalanceTime === "close-open"

				posStrategies.push({
					name: strategyName,
					latestTime,
					hasTimingOrOverride,
					sellTimeStr,
					buyTimeStr,
					rebalanceTime,
					isOvernightRebalance,
				})

				logger.info(
					`[strategy-status] select策略 ${index}(${strategyName}): 卖出时间=${sellTimeStr}, 买入时间=${buyTimeStr}, timing时间=${latestTime}, hasTimingOrOverride=${hasTimingOrOverride}`,
				)
			}
		}

		// 为每个策略生成状态
		const result: StrategyStatus[][] = await Promise.all(
			posStrategies.map(async (posStrategy) => {
				return await generateSingleStrategyStatus(
					posStrategy.name,
					posStrategy.latestTime,
					posStrategy.hasTimingOrOverride,
					posStrategy.sellTimeStr,
					posStrategy.buyTimeStr,
					date,
					posStrategy.isOvernightRebalance,
					posStrategy.isStrategyPool ?? false,
				)
			}),
		)

		logger.info(
			`[strategy-status] 生成了 ${posStrategies.length} 个仓位管理策略的状态列表`,
		)

		return result
	} catch (error) {
		logger.error(`[strategy-status] 生成pos策略状态列表失败: ${error}`)
		return []
	}
}
