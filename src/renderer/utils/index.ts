/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { ToastMessage } from "@/renderer/hooks/useHandleTimeTask"
import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"
import isBetween from "dayjs/plugin/isBetween"
import type { TimeValue } from "react-aria"
dayjs.extend(isBetween)
dayjs.extend(customParseFormat)

const { openDirectory, getStrategyResultPath, getStoreValue } =
	window.electronAPI

export const isNumber = (value: unknown): value is number =>
	typeof value === "number"

/**
 * 打开数据文件夹
 * @returns {Promise<void>}
 */
export const openDataFolder = async (): Promise<void> => {
	let allDataPath = (await getStoreValue("settings.all_data_path")) as string
	allDataPath = allDataPath.replace(/"/g, "") // -- 去除双引号
	await openDirectory([allDataPath])
}

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

/**
 * 将时间字符串解析为 TimeValue 对象
 * @param {string} time - 时间字符串，格式为 "HH:MM"
 * @returns {Promise<TimeValue>} 解析后的 TimeValue 对象
 */
export const parseToTimeValue = (time: string): TimeValue => {
	const [hour, minute] = time.split(":").map(Number)
	return { hour, minute } as TimeValue
}

/**
 * 将时间字符串解析为包含秒的 TimeValue 对象
 * @param {string} time - 时间字符串，格式为 "HH:MM:SS"
 * @returns {Promise<TimeValue>} 解析后的 TimeValue 对象
 */
export const parseToTimeValueWithSecond = (time: string): TimeValue => {
	const [hour, minute, second] = time.split(":").map(Number)
	return { hour, minute, second } as TimeValue
}

export const formatTimeValue = (time: number): string => {
	return time.toString().padStart(2, "0")
}

export function isTimeInRange(
	time: TimeValue,
	start: string,
	end: string,
): boolean {
	const timeString = `${formatTimeValue(time.hour)}:${formatTimeValue(
		time.minute,
	)}:${formatTimeValue(time.second || 0)}`
	const currentTime = dayjs(timeString, "HH:mm:ss")
	const startTime = dayjs(start, "HH:mm:ss")
	const endTime = dayjs(end, "HH:mm:ss")

	return currentTime.isBetween(startTime, endTime, null, "[]")
}

let timeoutId: NodeJS.Timeout | null = null
let intervalId: NodeJS.Timeout | null = null

/**
 * 计算到下一个指定时间的毫秒数
 * @param {string} timeStr - 目标时间字符串，格式为 "HH:MM"
 * @returns {number} 距离下一次执行的毫秒数
 */
const getTimeUntilNextExecution = (timeStr: string): number => {
	const [targetHour, targetMinute] = timeStr.split(":").map(Number)
	const now = new Date()
	const nextExecution = new Date(now)

	nextExecution.setHours(targetHour, targetMinute, 0, 0)

	// -- 如果当前时间已经超过了指定时间，则设置为明天的该时间
	if (now > nextExecution) {
		nextExecution.setDate(nextExecution.getDate() + 1)
	}

	return nextExecution.getTime() - now.getTime()
}

/**
 * 设置每日定时任务
 * @param {string} timeStr - 执行时间字符串，格式为 "HH:MM"
 * @param {Function} dailyTask - 每日执行的任务函数
 * @returns {void}
 */
export const scheduleDailyTask = (
	timeStr: string,
	dailyTask: (
		isPause: boolean,
		showToast?: boolean,
		messages?: Partial<ToastMessage>,
	) => Promise<boolean>,
): void => {
	clearScheduledTasks() // -- 清除之前的定时器和间隔器

	const executeTask = async () => {
		await dailyTask(false)
		// -- 设置下一次执行的定时器
		timeoutId = setTimeout(executeTask, 24 * 60 * 60 * 1000)
	}

	// -- 设置初次执行的定时器
	timeoutId = setTimeout(executeTask, getTimeUntilNextExecution(timeStr))
}

/**
 * 清除所有定时任务
 * @returns {void}
 */
export const clearScheduledTasks = (): void => {
	if (timeoutId) {
		clearTimeout(timeoutId)
		timeoutId = null
	}
	if (intervalId) {
		clearInterval(intervalId)
		intervalId = null
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
