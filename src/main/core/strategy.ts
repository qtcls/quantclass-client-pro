/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

// import { checkFuelExist } from "@/main/core/runpy.js"
import { execBin } from "@/main/lib/process.js"
import store, { rStore } from "@/main/store/index.js"
import { isKernalBusy } from "@/main/utils/tools.js"
import logger from "@/main/utils/wiston.js"
import type { StrategyStatus } from "@/shared/types/strategy-status.js"
import { StrategyStatusEnum } from "@/shared/types/strategy-status.js"

import { sortBy } from "lodash-es"

export type {
	StrategyStatusTag,
	StrategyStatusPlan,
	StrategyStatusStat,
} from "@/shared/types/strategy-status.js"
export type { StrategyStatus } from "@/shared/types/strategy-status.js"
export { StrategyStatusEnum } from "@/shared/types/strategy-status.js"

/**
 * 从单个策略配置中提取最晚时间
 * @param strategy
 * @returns {latestTime: string, hasTimingOrOverride: boolean}
 */
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
 * @param dayOffset 天数偏移，0为今天，-1为昨天，1为明天
 * @returns Date对象或null
 */
function parseTimeToDate(timeStr: string, dayOffset = 0): Date | null {
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

	const now = new Date()
	const date = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate() + dayOffset,
		hour,
		minute,
		second,
	)

	return date
}

/**
 * 将时间字符串（如"0945"）转换为描述（如"09:45"）
 */
function formatTimeDescription(timeStr: string): string {
	if (!/^\d{4}$/.test(timeStr)) {
		return timeStr
	}
	return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`
}

/**
 * 根据计划时间和实际执行时间判断状态
 * @param planTime 计划时间（单个时间或时间范围）
 * @param stat 实际执行状态（可选）
 * @returns 状态枚举值
 */
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

	// 如果还没有实际执行时间（还未开始）
	if (!stat?.time) {
		// 处理时间范围
		if (Array.isArray(planTime)) {
			const [, endTime] = planTime

			// 当前时间还没到开始时间，或者在范围内但还没开始执行
			if (now <= endTime) {
				return StrategyStatusEnum.PENDING
			}

			// 当前时间超出结束时间但没有执行记录
			return StrategyStatusEnum.INCOMPLETE
		}

		// 处理单个时间点
		// 如果当前时间还没到计划时间，状态为pending（未到预期时间）
		if (now < planTime) {
			return StrategyStatusEnum.PENDING
		}

		// 如果当前时间已过计划时间但没有执行记录，状态为incomplete（未完成）
		return StrategyStatusEnum.INCOMPLETE
	}

	// 有实际执行时间，需要判断是否已完成

	// 处理时间范围
	if (Array.isArray(planTime) && Array.isArray(stat.time)) {
		const [, planEndTime] = planTime
		const [statStartTime, statEndTime] = stat.time

		// 如果 stat 只有开始时间没有结束时间（正在进行中）
		if (statStartTime && !statEndTime) {
			const now = new Date()
			// 如果当前时间还在预期范围内
			if (now <= planEndTime) {
				return StrategyStatusEnum.IN_PROGRESS
			}
			// 超过预期结束时间但还未完成
			return StrategyStatusEnum.INCOMPLETE
		}

		// 如果有完整的开始和结束时间，判断是否超时
		if (statEndTime > planEndTime) {
			return StrategyStatusEnum.INCOMPLETE
		}

		// 未超过，已完成
		return StrategyStatusEnum.COMPLETED
	}

	// 处理单个时间点：判断实际完成时间是否超过预计时间
	if (!Array.isArray(planTime) && !Array.isArray(stat.time)) {
		// 如果实际完成时间超过预计时间
		if (stat.time > planTime) {
			return StrategyStatusEnum.INCOMPLETE
		}

		// 未超过，已完成
		return StrategyStatusEnum.COMPLETED
	}

	// 类型不匹配（理论上不应该发生），默认为pending
	logger.warn("[strategy-status] plan 和 stat 的时间类型不匹配")
	return StrategyStatusEnum.PENDING
}

/**
 * 生成单个策略的状态列表
 */
function generateSingleStrategyStatus(
	strategyName: string,
	latestTiming: string,
	hasTimingOrOverride: boolean,
	sellTimeStr: string,
	buyTimeStr: string,
): StrategyStatus[] {
	const qmtDataTime = parseTimeToDate(latestTiming)
	const qmtDataTimeDes = formatTimeDescription(latestTiming)

	// 从卖出时间推算交易计划生成时间（卖出前2分钟）
	const sellTime = parseTimeToDate(sellTimeStr.replace(/:/g, ""))
	const tradingPlanTime = sellTime
		? new Date(sellTime.getTime() - 2 * 60 * 1000)
		: null

	// QMT_DATA_FUZZY, QMT_DATA, SINGAL_FUZZY, SIGNAL 的时间范围都是 [qmtDataTime, tradingPlanTime]
	const qmtToTradingTimeRange: [Date, Date] | null =
		qmtDataTime && tradingPlanTime ? [qmtDataTime, tradingPlanTime] : null

	// 前一天的时间（股市收盘、数据更新、选股生成都是前一天的事）
	const marketCloseTime = parseTimeToDate("1500", -1)
	const dataUpdateTimeRange: [Date, Date] = [
		parseTimeToDate("1600", -1)!,
		parseTimeToDate("2200", -1)!,
	]
	const selectStockTime = parseTimeToDate("0000") // 当天0点（实际是前一天晚上的事件完成后）

	// 当天的时间
	const rocketInitTime = parseTimeToDate("0900")
	const preSellTimeRange: [Date, Date] = [
		parseTimeToDate("0915")!,
		parseTimeToDate("0930")!,
	]

	const buyTime = parseTimeToDate(buyTimeStr.replace(/:/g, ""))

	const statusList: StrategyStatus[] = [
		{
			strategyName,
			tag: "MARKET_CLOSE",
			title: "股市收盘",
			description: "股市收盘时间",
			status: determineStatus(marketCloseTime),
			plan: {
				time: marketCloseTime,
				timeDes: "昨日 15:00",
			},
		},
		{
			strategyName,
			tag: "DATA_UPDATE",
			title: "历史数据更新",
			description: "更新历史行情数据",
			status: determineStatus(dataUpdateTimeRange),
			plan: {
				time: dataUpdateTimeRange,
				timeDes: "昨日 16:00～22:00",
			},
		},
		{
			strategyName,
			tag: "SELECT_STOCK",
			title: "生成选股",
			description: "数据完成更新后，每天0点会强制刷新选股结果",
			status: determineStatus(selectStockTime),
			plan: {
				time: selectStockTime,
				timeDes: "00:00",
			},
		},
		{
			strategyName,
			tag: "ROCKET_INIT",
			title: "Rocket启动",
			description: "启动实盘交易引擎",
			status: determineStatus(rocketInitTime),
			plan: {
				time: rocketInitTime,
				timeDes: "09:00",
			},
		},
		{
			strategyName,
			tag: "PRE_SELL",
			title: "集合竞价卖出",
			description: "在集合竞价期间执行卖出操作（当前有非空卖出计划时）",
			status: determineStatus(preSellTimeRange),
			plan: {
				time: preSellTimeRange,
				timeDes: "09:15-09:30，且当前有非空卖出计划",
			},
		},
		{
			strategyName,
			tag: "TRADING_PLAN",
			title: "生成买入/卖出计划",
			description: "在卖出时间前2分钟生成交易计划",
			status: determineStatus(tradingPlanTime),
			plan: {
				time: tradingPlanTime,
				timeDes: tradingPlanTime ? `${sellTimeStr}前2分钟` : "卖出时间前2分钟",
			},
		},
		{
			strategyName,
			tag: "SELL",
			title: "实盘卖出",
			description: "执行实盘卖出操作",
			status: determineStatus(sellTime),
			plan: {
				time: sellTime,
				timeDes: sellTimeStr,
			},
		},
		{
			strategyName,
			tag: "BUY",
			title: "实盘买入",
			description: "执行实盘买入操作",
			status: determineStatus(buyTime),
			plan: {
				time: buyTime,
				timeDes: buyTimeStr,
			},
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
				status: determineStatus(qmtToTradingTimeRange),
				plan: {
					time: qmtToTradingTimeRange,
					timeDes: qmtToTradingTimeRange
						? `${qmtDataTimeDes}～${tradingPlanTime ? formatTimeDescription(tradingPlanTime.getHours().toString().padStart(2, "0") + tradingPlanTime.getMinutes().toString().padStart(2, "0")) : "交易计划时间"}`
						: `09:30-${qmtDataTimeDes}，策略中${qmtDataTimeDes}配置一致，1-2分钟后开始`,
				},
			},
			{
				strategyName,
				tag: "QMT_DATA",
				title: "获取QMT盘中行情数据",
				description: `预计在${qmtDataTimeDes}后1-2分钟开始`,
				status: determineStatus(qmtToTradingTimeRange),
				plan: {
					time: qmtToTradingTimeRange,
					timeDes: qmtToTradingTimeRange
						? `${qmtDataTimeDes}～${tradingPlanTime ? formatTimeDescription(tradingPlanTime.getHours().toString().padStart(2, "0") + tradingPlanTime.getMinutes().toString().padStart(2, "0")) : "交易计划时间"}`
						: `09:30-${qmtDataTimeDes}，策略中${qmtDataTimeDes}配置一致，1-2分钟后开始`,
				},
			},
			{
				strategyName,
				tag: "SINGAL_FUZZY",
				title: "计算模糊择时信号",
				description: "在获取到模糊行情数据后进行计算",
				status: determineStatus(qmtToTradingTimeRange),
				plan: {
					time: qmtToTradingTimeRange,
					timeDes: qmtToTradingTimeRange
						? `${qmtDataTimeDes}～${tradingPlanTime ? formatTimeDescription(tradingPlanTime.getHours().toString().padStart(2, "0") + tradingPlanTime.getMinutes().toString().padStart(2, "0")) : "交易计划时间"}`
						: "在获取到模糊行情数据后，预计需要2-5分钟",
				},
			},
			{
				strategyName,
				tag: "SIGNAL",
				title: "计算精确择时信号",
				description: "在获取到行情数据后进行计算",
				status: determineStatus(qmtToTradingTimeRange),
				plan: {
					time: qmtToTradingTimeRange,
					timeDes: qmtToTradingTimeRange
						? `${qmtDataTimeDes}～${tradingPlanTime ? formatTimeDescription(tradingPlanTime.getHours().toString().padStart(2, "0") + tradingPlanTime.getMinutes().toString().padStart(2, "0")) : "交易计划时间"}`
						: "在获取到行情数据后，预计需要2-5分钟",
				},
			},
		)
	}

	return sortBy(statusList, (s) => {
		const t = Array.isArray(s.plan.time) ? s.plan.time[0] : s.plan.time
		return t ? t.getTime() : Number.POSITIVE_INFINITY
	})
}

/**
 * 生成策略状态列表（二维数组）
 * 根据 config.json 中的 strategy_list 为每个策略生成状态
 */
export async function getStrategyStatusList(): Promise<StrategyStatus[][]> {
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
		const result: StrategyStatus[][] = strategyList.map(
			(strategy: any, index: number) => {
				const strategyKey = `strategy_${index}`
				const strategyConfig = rStore.get(strategyKey) as any

				const strategyName = strategy.name

				const sellTimeStr = strategyConfig?.sell?.[1] ?? ""
				const buyTimeStr = strategyConfig?.buy?.[1] ?? ""

				const { latestTime, hasTimingOrOverride } = getStrategyTiming(strategy)

				logger.info(
					`[strategy-status] 策略 ${index}(${strategyName}): 卖出时间=${sellTimeStr}, 买入时间=${buyTimeStr}, timing时间=${latestTime}, hasTimingOrOverride=${hasTimingOrOverride}`,
				)

				return generateSingleStrategyStatus(
					strategyName,
					latestTime,
					hasTimingOrOverride,
					sellTimeStr,
					buyTimeStr,
				)
			},
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

// 增量更新和定时增量更新
export async function updateStrategies(strategy?: string, manual = "manual") {
	try {
		logger.info(`check pycore exist before update ${strategy}`)
		// await checkFuelExist()
		logger.info(`manually update ${strategy}`)

		const isFuelBusy = await isKernalBusy("fuel")

		!isFuelBusy && strategy
			? await execBin(["one_strategy", strategy], `更新策略-${strategy}`)
			: await execBin(["all_strategy", manual], "更新全部策略")

		return {
			status: "success",
			message: `执行 ${strategy ?? "全部"} 策略数据增量更新`,
		}
	} catch (error) {
		logger.error(error)
	}

	return {
		status: "error",
		message: `执行 ${strategy ?? "全部"} 不成功`,
	}
}
