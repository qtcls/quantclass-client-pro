/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import fs from "node:fs/promises"
import store from "@/main/store/index.js"
import logger from "@/main/utils/wiston.js"
// @ts-ignore
import type { IDataListType } from "@/renderer/schemas/data-schema"

// -- 读取文件内容的辅助函数
export const readJsonFile = async (filePath: string) => {
	try {
		await fs.access(filePath)
	} catch (error) {
		logger.warn(`[json] 文件 ${filePath} 不存在`)
		return null
	}

	const dataBuffer = await fs.readFile(filePath, "utf-8")
	if (dataBuffer.trim().length === 0) {
		logger.warn(`文件 ${filePath} 为空`)
		return null
	}

	return JSON.parse(dataBuffer)
}

// -- 分页辅助函数
const paginateData = <T>(data: T[], start: number, end: number) =>
	data.slice(start, end)

// -- 通用的文件读取和解析函数
export const getJsonDataFromFile = async <T = unknown>(
	filePath: string[],
	errorMessage: string,
	defaultValue: T = [] as T,
): Promise<T> => {
	const fullPath = await store.getAllDataPath(filePath)
	try {
		await fs.access(fullPath)
	} catch (error) {
		logger.warn(`[json] 文件 ${fullPath} 不存在`)
		return defaultValue
	}
	const fileData = await readJsonFile(fullPath)

	if (!fileData) {
		logger.warn(errorMessage)
		return defaultValue
	}

	logger.info(`成功读取文件：${fullPath}`)
	return fileData
}

export const getDataList = async (params: {
	cur: number
	pageSize: number
	file_name: string
}): Promise<{
	total: number
	dataList: Array<Partial<IDataListType>>
}> => {
	try {
		const {
			cur = 1,
			pageSize = 20,
			file_name = "products-status.json",
		} = params
		const filePath = await store.getAllDataPath(["code", "data", file_name])

		const start = (cur - 1) * pageSize
		const end = cur * pageSize

		const isStrategyFile = file_name !== "products-status.json"
		const whiteListKey = isStrategyFile
			? "settings.strategy_white_list"
			: "settings.data_white_list"
		const mapKey = isStrategyFile ? "strategy_map" : "data_map"

		let dataMap = await store.getValue<
			Array<{
				key: string
				name: string
				displayName: string
				course_access: string[]
			}>
		>(mapKey, [])
		const whiteList = (await store.getValue(whiteListKey, [])) as string[]
		if (!isStrategyFile) {
			whiteList.includes("coin-binance-candle-csv-1h-daily") &&
				whiteList.includes("coin-binance-swap-candle-csv-1h-daily") &&
				whiteList.push("coin-binance-spot-swap-preprocess-pkl-1h")
		}

		const fileData = await readJsonFile(filePath)

		if (fileData) {
			dataMap = dataMap.map((item) => {
				const key = isStrategyFile ? item.key : item.name
				return fileData[key] ? { ...item, ...fileData[key] } : item
			})
			store.setValue(mapKey, dataMap)
		}

		const filteredData = dataMap.filter((item) =>
			whiteList.includes(isStrategyFile ? item.key : item.name),
		)

		const paginatedData = paginateData(filteredData, start, end)

		return {
			dataList: paginatedData,
			total: filteredData?.length ?? 0,
		}
	} catch (error) {
		logger.error(`获取数据列表时出错: ${error}`)
		throw error
	}
}

export const getBuyInfoList = async () => {
	return getJsonDataFromFile(
		["real_trading", "rocket", "data", "buy.json"],
		"买入信息文件不存在或为空",
	)
}

export const getSellInfoList = async () => {
	return getJsonDataFromFile(
		["real_trading", "rocket", "data", "sell.json"],
		"卖出信息文件不存在或为空",
	)
}

export const getBuyTimingInfoList = async () => {
	return getJsonDataFromFile(
		["real_trading", "rocket", "data", "个股择时-买入计划.json"],
		"个股择时买入计划文件不存在或为空",
	)
}

export const getSellTimingInfoList = async () => {
	return getJsonDataFromFile(
		["real_trading", "rocket", "data", "个股择时-卖出计划.json"],
		"个股择时卖出计划文件不存在或为空",
	)
}
