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
import type {
	StrategyStatus,
	StrategyStatusStat,
} from "@/shared/types/strategy-status.js"
import { StrategyStatusEnum } from "@/shared/types/strategy-status.js"
import { sortBy } from "lodash-es"

// 从 JSON 文件读取 stats 数据
async function readStatsFromJson(date: string): Promise<StrategyStatusStat[]> {
	try {
		const fileName = `fuel-stats-${date}.json`
		const filePath = ["code", "data", fileName]

		const data = await getJsonDataFromFile<{ stats?: any[] }>(
			filePath,
			`读取stats文件失败: ${filePath.join("/")}`,
			{},
		)

		if (!data.stats || !Array.isArray(data.stats)) {
			logger.warn(
				`[strategy-stats] 文件 ${filePath.join("/")} 中没有stats字段或格式不正确`,
			)
			return []
		}

		const stats: StrategyStatusStat[] = data.stats.map((stat: any) => {
			return {
				tag: stat.tag || "",
				time: stat.time ? new Date(stat.time) : null,
				timeDes: stat.timeDes || "",
				messages: Array.isArray(stat.messages) ? stat.messages : [],
				...(stat.batchId && { batchId: stat.batchId }),
			}
		})

		logger.info(
			`[strategy-stats] 成功从 ${fileName} 读取了 ${stats.length} 条stats记录`,
		)

		return stats
	} catch (error) {
		logger.error(`[strategy-stats] 读取stats文件失败: ${error}`)
		return []
	}
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

// 将时间字符串（如"0945"）转换为描述（如"09:45"）
function formatTimeDescription(timeStr: string): string {
	if (!/^\d{4}$/.test(timeStr)) {
		return timeStr
	}
	return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`
}

// 根据计划时间和实际执行时间判断状态
function determineStatus(
	planTime: Date | null | [Date, Date],
	stat?: {
		time: Date | null | [Date, Date]
		timeDes: string
		messages: string[]
	},
): StrategyStatusEnum {
	// 如果没有计划时间，默认为pending
	if (!planTime) {
		return StrategyStatusEnum.PENDING
	}

	const now = new Date()

	const planEndTime = Array.isArray(planTime) ? planTime[1] : planTime

	// 如果还没有实际执行时间（还未开始）
	if (!stat?.time) {
		if (now <= planEndTime) {
			return StrategyStatusEnum.PENDING
		}

		return StrategyStatusEnum.INCOMPLETE
	}

	// 有实际执行时间，需要判断是否已完成
	const statEndTime = Array.isArray(stat.time) ? stat.time[1] : stat.time

	// 如果 stat 正在进行中（数组类型但没有结束时间）
	if (Array.isArray(stat.time) && !statEndTime) {
		if (now <= planEndTime) {
			return StrategyStatusEnum.IN_PROGRESS
		}

		return StrategyStatusEnum.INCOMPLETE
	}

	// 判断实际结束时间是否超过预期结束时间
	if (statEndTime && statEndTime > planEndTime) {
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
): Promise<StrategyStatus[]> {
	const fuelStats = await readStatsFromJson(date)
	const qmtDataTime = parseTimeToDate(latestTiming, date)
	const qmtDataTimeDes = formatTimeDescription(latestTiming)
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

	// QMT_DATA_FUZZY, QMT_DATA, SINGAL_FUZZY, SIGNAL 的时间范围都是 [qmtDataTime, tradingPlanTime]
	const qmtToTradingTimeRange: [Date, Date] | null =
		qmtDataTime && tradingPlanTime ? [qmtDataTime, tradingPlanTime] : null

	// 前一天的时间（股市收盘、数据更新、选股生成都是前一天的事）
	const marketCloseTime = parseTimeToDate("1500", date, -1)
	const dataUpdateTimeRange: [Date, Date] = [
		parseTimeToDate("1600", date, -1)!,
		parseTimeToDate("2200", date, -1)!,
	]
	const selectStockTime = parseTimeToDate("0000", date) // 当天0点（实际是前一天晚上的事件完成后）

	// 当天的时间
	const rocketInitTime = parseTimeToDate("0900", date)
	const preSellTimeRange: [Date, Date] = [
		parseTimeToDate("0915", date)!,
		parseTimeToDate("0930", date)!,
	]

	const buyTime = parseTimeToDate(buyTimeStr.replace(/:/g, ""), date)

	const findStatsByTag = (tag: string) => {
		return fuelStats.filter((stat) => stat.tag === tag)
	}

	const findLatestStatByTag = (tag: string) => {
		const matchingStats = findStatsByTag(tag)
		return matchingStats.length > 0
			? matchingStats[matchingStats.length - 1]
			: undefined
	}

	const statusList: StrategyStatus[] = [
		{
			strategyName,
			tag: "MARKET_CLOSE",
			title: "股市收盘",
			description: "股市收盘时间",
			status: determineStatus(
				marketCloseTime,
				findLatestStatByTag("MARKET_CLOSE"),
			),
			plan: {
				time: marketCloseTime,
				timeDes: "昨日 15:00",
			},
			stat: findLatestStatByTag("MARKET_CLOSE"),
			stats: findStatsByTag("MARKET_CLOSE"),
		},
		{
			strategyName,
			tag: "DATA_UPDATE",
			title: "历史数据更新",
			description: "更新历史行情数据",
			status: determineStatus(
				dataUpdateTimeRange,
				findLatestStatByTag("DATA_UPDATE"),
			),
			plan: {
				time: dataUpdateTimeRange,
				timeDes: "昨日 16:00～22:00",
			},
			stat: findLatestStatByTag("DATA_UPDATE"),
			stats: findStatsByTag("DATA_UPDATE"),
		},
		{
			strategyName,
			tag: "SELECT_STOCK",
			title: "生成选股",
			description: "数据完成更新后，每天0点会强制刷新选股结果",
			status: determineStatus(
				selectStockTime,
				findLatestStatByTag("SELECT_STOCK"),
			),
			plan: {
				time: selectStockTime,
				timeDes: "00:00",
			},
			stat: findLatestStatByTag("SELECT_STOCK"),
			stats: findStatsByTag("SELECT_STOCK"),
		},
		{
			strategyName,
			tag: "ROCKET_INIT",
			title: "Rocket启动",
			description: "启动实盘交易引擎",
			status: determineStatus(
				rocketInitTime,
				findLatestStatByTag("ROCKET_INIT"),
			),
			plan: {
				time: rocketInitTime,
				timeDes: "09:00",
			},
			stat: findLatestStatByTag("ROCKET_INIT"),
			stats: findStatsByTag("ROCKET_INIT"),
		},
		{
			strategyName,
			tag: "PRE_SELL",
			title: "集合竞价卖出",
			description: "在集合竞价期间执行卖出操作（当前有非空卖出计划时）",
			status: determineStatus(
				preSellTimeRange,
				findLatestStatByTag("PRE_SELL"),
			),
			plan: {
				time: preSellTimeRange,
				timeDes: "09:15-09:30，且当前有非空卖出计划",
			},
			stat: findLatestStatByTag("PRE_SELL"),
			stats: findStatsByTag("PRE_SELL"),
		},
		{
			strategyName,
			tag: "TRADING_PLAN",
			title: "生成买入/卖出计划",
			description: "在卖出时间前2分钟生成交易计划",
			status: determineStatus(
				tradingPlanTime,
				findLatestStatByTag("TRADING_PLAN"),
			),
			plan: {
				time: tradingPlanTime,
				timeDes: tradingPlanTime
					? isOvernightRebalance
						? `昨日 ${sellTimeStr}前2分钟`
						: `${sellTimeStr}前2分钟`
					: "卖出时间前2分钟",
			},
			stat: findLatestStatByTag("TRADING_PLAN"),
			stats: findStatsByTag("TRADING_PLAN"),
		},
		{
			strategyName,
			tag: "SELL",
			title: "实盘卖出",
			description: "执行实盘卖出操作",
			status: determineStatus(sellTime, findLatestStatByTag("SELL")),
			plan: {
				time: sellTime,
				timeDes: isOvernightRebalance ? `昨日 ${sellTimeStr}` : sellTimeStr,
			},
			stat: findLatestStatByTag("SELL"),
			stats: findStatsByTag("SELL"),
		},
		{
			strategyName,
			tag: "BUY",
			title: "实盘买入",
			description: "执行实盘买入操作",
			status: determineStatus(buyTime, findLatestStatByTag("BUY")),
			plan: {
				time: buyTime,
				timeDes: buyTimeStr,
			},
			stat: findLatestStatByTag("BUY"),
			stats: findStatsByTag("BUY"),
		},
	]

	// 只有当存在 timing 或 override 时，添加这四个可选状态
	if (hasTimingOrOverride) {
		statusList.push(
			{
				strategyName,
				tag: "QMT_DATA_FUZZY",
				title: "获取QMT盘中模糊行情数据",
				description: `预计在${qmtDataTimeDes}后1-2分钟开始`,
				status: determineStatus(
					qmtToTradingTimeRange,
					findLatestStatByTag("QMT_DATA_FUZZY"),
				),
				plan: {
					time: qmtToTradingTimeRange,
					timeDes: qmtToTradingTimeRange
						? `${qmtDataTimeDes}～${tradingPlanTime ? formatTimeDescription(tradingPlanTime.getHours().toString().padStart(2, "0") + tradingPlanTime.getMinutes().toString().padStart(2, "0")) : "交易计划时间"}`
						: `09:30-${qmtDataTimeDes}，策略中${qmtDataTimeDes}配置一致，1-2分钟后开始`,
				},
				stat: findLatestStatByTag("QMT_DATA_FUZZY"),
				stats: findStatsByTag("QMT_DATA_FUZZY"),
			},
			{
				strategyName,
				tag: "QMT_DATA",
				title: "获取QMT盘中行情数据",
				description: `预计在${qmtDataTimeDes}后1-2分钟开始`,
				status: determineStatus(
					qmtToTradingTimeRange,
					findLatestStatByTag("QMT_DATA"),
				),
				plan: {
					time: qmtToTradingTimeRange,
					timeDes: qmtToTradingTimeRange
						? `${qmtDataTimeDes}～${tradingPlanTime ? formatTimeDescription(tradingPlanTime.getHours().toString().padStart(2, "0") + tradingPlanTime.getMinutes().toString().padStart(2, "0")) : "交易计划时间"}`
						: `09:30-${qmtDataTimeDes}，策略中${qmtDataTimeDes}配置一致，1-2分钟后开始`,
				},
				stat: findLatestStatByTag("QMT_DATA"),
				stats: findStatsByTag("QMT_DATA"),
			},
			{
				strategyName,
				tag: "SINGAL_FUZZY",
				title: "计算模糊择时信号",
				description: "在获取到模糊行情数据后进行计算",
				status: determineStatus(
					qmtToTradingTimeRange,
					findLatestStatByTag("SINGAL_FUZZY"),
				),
				plan: {
					time: qmtToTradingTimeRange,
					timeDes: qmtToTradingTimeRange
						? `${qmtDataTimeDes}～${tradingPlanTime ? formatTimeDescription(tradingPlanTime.getHours().toString().padStart(2, "0") + tradingPlanTime.getMinutes().toString().padStart(2, "0")) : "交易计划时间"}`
						: "在获取到模糊行情数据后，预计需要2-5分钟",
				},
				stat: findLatestStatByTag("SINGAL_FUZZY"),
				stats: findStatsByTag("SINGAL_FUZZY"),
			},
			{
				strategyName,
				tag: "SIGNAL",
				title: "计算精确择时信号",
				description: "在获取到行情数据后进行计算",
				status: determineStatus(
					qmtToTradingTimeRange,
					findLatestStatByTag("SIGNAL"),
				),
				plan: {
					time: qmtToTradingTimeRange,
					timeDes: qmtToTradingTimeRange
						? `${qmtDataTimeDes}～${tradingPlanTime ? formatTimeDescription(tradingPlanTime.getHours().toString().padStart(2, "0") + tradingPlanTime.getMinutes().toString().padStart(2, "0")) : "交易计划时间"}`
						: "在获取到行情数据后，预计需要2-5分钟",
				},
				stat: findLatestStatByTag("SIGNAL"),
				stats: findStatsByTag("SIGNAL"),
			},
		)
	}

	return sortBy(statusList, (s) => {
		const t = Array.isArray(s.plan.time) ? s.plan.time[0] : s.plan.time
		// time 为 null，排在最后
		return t ? t.getTime() : Number.POSITIVE_INFINITY
	})
}

/**
 * 生成策略状态列表（二维数组）
 * 根据 config.json 中的 strategy_list 为每个策略生成状态
 */
export async function getStrategyStatusList(
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

				const strategyName = strategy.name

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
				)
			}),
		)

		logger.info(
			`[strategy-status] 生成了 ${strategyList.length} 个策略的状态列表`,
		)

		return result
	} catch (error) {
		logger.error(`[strategy-status] 生成策略状态列表失败: ${error}`)
		return []
	}
}
