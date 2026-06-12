/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { PosStrategyType, SelectStgType } from "@/renderer/types/strategy"
import { pad2 } from "@/shared/lib/trading-day"
import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"
import isBetween from "dayjs/plugin/isBetween"
import type { TimeValue } from "react-aria"
import { autoTradeTimeByRebTime } from "./trade"

dayjs.extend(isBetween)
dayjs.extend(customParseFormat)

const { openDirectory, getStrategyResultPath, getStoreValue } =
	window.electronAPI

enum IntradayWap {
	"close-open" = 0,
	open = 1,
	close = 2,
}

export const isNumber = (value: unknown): value is number =>
	typeof value === "number"

/**
 * 打开试运行结果文件夹
 */
export const openRealTradingFolder = async (): Promise<void> => {
	let allDataPath = (await getStoreValue("settings.all_data_path")) as string
	allDataPath = allDataPath.replace(/"/g, "") // -- 去除双引号
	await openDirectory([allDataPath, "real_trading"])
}

/**
 * 打开试运行结果文件夹
 */
export const openBacktestResultFolder = async (): Promise<void> => {
	const strategyResultPath = await getStrategyResultPath()
	await openDirectory([strategyResultPath])
}

/**
 * 打开试运行结果文件夹
 */
export const openRealResultFolder = async (): Promise<void> => {
	const strategyResultPath = await getStrategyResultPath("trading")
	await openDirectory([strategyResultPath])
}


export function isTimeInRange(
	time: TimeValue,
	start: string,
	end: string,
): boolean {
	const timeString = `${pad2(time.hour)}:${pad2(
		time.minute,
	)}:${pad2(time.second || 0)}`
	const currentTime = dayjs(timeString, "HH:mm:ss")
	const startTime = dayjs(start, "HH:mm:ss")
	const endTime = dayjs(end, "HH:mm:ss")

	return currentTime.isBetween(startTime, endTime, null, "[]")
}

/**
 * 生成选股策略实盘交易配置
 * @param stg 策略对象
 * @returns 实盘交易配置的字典
 */
export function genSelectStrategyDict(
	stg: SelectStgType,
	trade_time:
		| { sell_time: TimeValue; buy_time: TimeValue }
		| undefined = undefined,
) {
	const reb_time = stg.rebalance_time ?? "close-open"
	const { sell_time, buy_time } = trade_time ?? autoTradeTimeByRebTime(reb_time) // -- 生成自动交易时间
	return {
		strategy_weight: stg.cap_weight,
		hold_plan: (stg.offset_list || [0]).map(
			(offset) => `${(stg.hold_period ?? "5D").replace("D", "")}_${offset}`,
		),
		select_count: stg.select_num,
		stock_weight: ["equal_weight", false], // -- 默认为等权重，(当选股数量不足的时候，是否自动补足，false的话是全仓)
		buy: [
			"t_wap", // -- 拆单策略
			`${buy_time.hour.toString().padStart(2, "0")}:${buy_time.minute
				.toString()
				.padStart(2, "0")}:${
				buy_time.second?.toString().padStart(2, "0") ?? "00"
			}`, // 买入时间，时分秒补零
			Math.floor(Math.random() * (45 - 25 + 1)) + 25, // 随机买入时间间隔
			stg.split_order_amount ??
				Math.floor(Math.random() * (12000 - 6000 + 1)) + 6000, // 随机拆单金额
			1.005, // 买入价格浮动比例
		],
		sell: [
			"base_sell",
			`${sell_time.hour.toString().padStart(2, "0")}:${sell_time.minute
				.toString()
				.padStart(2, "0")}:${
				sell_time.second?.toString().padStart(2, "0") ?? "00"
			}`, // 卖出时间，时分秒补零
		], // -- 卖出策略，一笔全卖（夏普说的）
		risk: [false], // -- 默认为 false，客户端不改
		intraday_swap: IntradayWap[reb_time] ?? IntradayWap.open, // -- 默认为早盘换仓
		netting_tag: stg.rebalance_time,
	}
}

export function genPosMgmtStrategyDict(
	stg: PosStrategyType,
	trade_time:
		| { sell_time: TimeValue; buy_time: TimeValue }
		| undefined = undefined,
) {
	const reb_time = stg.rebalance_time ?? "close-open"
	const { sell_time, buy_time } = trade_time ?? autoTradeTimeByRebTime(reb_time) // -- 生成自动交易时间
	return {
		strategy_weight: stg.cap_weight,
		hold_plan: (stg.offset_list || [0]).map(
			(offset) => `${(stg.hold_period ?? "5D").replace("D", "")}_${offset}`,
		),
		select_count: stg.max_select_num ?? 3, // -- 目前选股数量这个数值基本不用，可以用max_select_num来补齐
		stock_weight: ["equal_weight", false], // -- 默认为等权重，(当选股数量不足的时候，是否自动补足，false的话是全仓)
		buy: [
			"t_wap", // -- 拆单策略
			// stg.buy_time ??
			`${buy_time.hour.toString().padStart(2, "0")}:${buy_time.minute
				.toString()
				.padStart(2, "0")}:${
				buy_time.second?.toString().padStart(2, "0") ?? "00"
			}`, // 买入时间，时分秒补零
			Math.floor(Math.random() * (45 - 25 + 1)) + 25, // 随机买入时间间隔
			stg.split_order_amount ??
				Math.floor(Math.random() * (12000 - 6000 + 1)) + 6000, // 随机拆单金额
			1.005, // 买入价格浮动比例
		],
		sell: [
			"base_sell",
			// stg.sell_time ??
			`${sell_time.hour.toString().padStart(2, "0")}:${sell_time.minute
				.toString()
				.padStart(2, "0")}:${
				sell_time.second?.toString().padStart(2, "0") ?? "00"
			}`, // 卖出时间，时分秒补零
		], // -- 卖出策略，一笔全卖（夏普说的）
		risk: [false], // -- 默认为 false，客户端不改
		intraday_swap: IntradayWap[reb_time] ?? IntradayWap.open, // -- 默认为早盘换仓
		netting_tag: stg.rebalance_time,
	}
}

export function generateNonStrategySelectStrategyConfig(
	item: [string, string, string, string, string, number],
) {
	return {
		strategy_weight: 0,
		hold_plan: [...item.slice(0, -1)],
		select_count: item[item.length - 1],
		stock_weight: ["equal_weight", false],
		buy: [
			"t_wap",
			`09:24:${Math.floor(Math.random() * 50) + 10}`,
			Math.floor(Math.random() * (45 - 25 + 1)) + 25,
			// -- 这是生成一个介于 6000 到 12000 之间的随机整数
			// -- 6000 是最小值，12000 是最大值
			// -- 用于模拟交易量或其他金融相关的随机数值
			Math.floor(Math.random() * (12000 - 6000 + 1)) + 6000,
			1.005,
		],
		sell: [
			"base_sell",
			`14:${Math.floor(Math.random() * 11) + 45}:${Math.floor(Math.random() * 50) + 10}`,
		],
		risk: [false],
		intraday_swap: 0,
	}
}

export function compareTimeValues(time1: TimeValue, time2: TimeValue): number {
	if (time1.hour !== time2.hour) {
		return time1.hour - time2.hour
	}
	if (time1.minute !== time2.minute) {
		return time1.minute - time2.minute
	}
	return (time1.second || 0) - (time2.second || 0)
}

/**
 * -- 检查用户是否仅拥有 2025 分享会资格
 */
export const isOnly2025Member = (membershipInfo?: string[]) => {
	if (!membershipInfo) return false

	const fenMembers = membershipInfo.filter((item) => item.startsWith("fen-"))

	return fenMembers.length === 1 && fenMembers[0] === "fen-2025"
}

/**
 * 验证股票代码是否合法
 * @param {string} code - 股票代码
 * @returns {boolean} 是否合法
 */
export const validateStockCode = (code: string): boolean => {
	// 股票代码格式：sz/sh/bj + 6位数字
	const stockCodePattern = /^(sz|sh|bj)\d{6}$/
	return stockCodePattern.test(code.toLowerCase())
}
