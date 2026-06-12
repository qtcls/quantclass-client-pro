/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import fs from "node:fs"
import {
	getBuyInfoList,
	getBuyTimingInfoList,
	getDataList,
	getJsonDataFromFile,
	getSellInfoList,
	getSellTimingInfoList,
} from "@/main/core/dataList.js"
import {
	downloadFullData,
	updateFullProducts,
	updateProduct,
} from "@/main/core/product.js"
import { updateStrategies } from "@/main/core/strategy/index.js"
import DBManager from "@/main/lib/db-manager.js"
import { execBin } from "@/main/lib/process.js"
import store from "@/main/store/index.js"
import { isKernalRunning, killKernalByForce } from "@/main/utils/tools.js"
import logger from "@/main/utils/wiston.js"
import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import { ipcMain } from "electron"

async function handleLoadProductStatus() {
	ipcMain.handle(IPC_CHANNELS.LOAD_PRODUCT_STATUS, async () => {
		logger.info(IPC_CHANNELS.LOAD_PRODUCT_STATUS)

		return await getJsonDataFromFile(
			["code", "data", "products-status.json"],
			"获取订阅数据信息失败",
			{},
		)
	})
}

async function handleExecDownloadZip() {
	ipcMain.handle(IPC_CHANNELS.EXEC_DOWNLOAD_ZIP, async (event, product_name: string) => {
		try {
			logger.info(`开始下载 ${product_name} 的完整数据`)
			return await downloadFullData(product_name, (progress) => {
				// 发送进度更新到渲染进程
				// logger.info(
				// 	`[下载进度] ${product_name}: ${progress.percent.toFixed(2)}% (${(progress.transferred / 1024 / 1024).toFixed(2)} MB / ${progress.total > 0 ? (progress.total / 1024 / 1024).toFixed(2) : "?"} MB)`,
				// )
				event.sender.send(IPC_CHANNELS.DOWNLOAD_PROGRESS, {
					product_name,
					...progress,
				})
			})
		} catch (error) {
			logger.error(`exec-download-zip ${product_name} error: ${error}`)
			throw new Error("数据 zip 下载失败")
		}
	})
}

async function handleUpdateOneProduct() {
	ipcMain.handle(
		IPC_CHANNELS.UPDATE_ONE_PRODUCT,
		async (_event, product?: string) => await updateProduct(product),
	)
}

async function handleUpdateFullProducts() {
	ipcMain.handle(
		IPC_CHANNELS.UPDATE_FULL_PRODUCTS,
		async (_event, product_name: string, full_data_name?: string) =>
			await updateFullProducts(product_name, full_data_name),
	)
}

async function handleUpdateStrategies() {
	ipcMain.handle(IPC_CHANNELS.UPDATE_STRATEGIES, async (_event, strategy?: string) => {
		await updateStrategies(strategy)
	})
}

async function getStrategySelectData() {
	ipcMain.handle(IPC_CHANNELS.STRATEGY_SELECT_DATA, async () => {
		try {
			const apiUrl = "https://api.quantclass.cn/index/beta/strategy/client-meta"

			const res = await fetch(apiUrl)

			return (await res.json())?.data
		} catch (error) {
			logger.error(`策略数据获取失败: ${error}`)
			throw new Error("策略数据获取失败")
		}
	})
}

async function queryDataListHandler(): Promise<void> {
	ipcMain.handle(
		IPC_CHANNELS.QUERY_DATA_LIST,
		async (
			_event: { sender: any },
			params: { cur: number; pageSize: number; file_name: string },
		) => {
			try {
				logger.info(`[ipc] query-data-list ${params.file_name}`)
				const res = await getDataList(params)

				return {
					status: "success",
					data: res,
				}
			} catch (error) {
				logger.error(
					`[ipc] query-data-list ${params.file_name} error: ${error}`,
				)

				return {
					status: "error",
					message: error,
				}
			}
		},
	)
}

async function getBuyInfoListHandler() {
	ipcMain.handle(IPC_CHANNELS.FETCH_BUY, async () => await getBuyInfoList())
}

async function getSellInfoListHandler() {
	ipcMain.handle(IPC_CHANNELS.FETCH_SELL, async () => await getSellInfoList())
}

async function getBuyTimingInfoListHandler() {
	ipcMain.handle(IPC_CHANNELS.FETCH_BUY_TIMING, async () => await getBuyTimingInfoList())
}

async function getSellTimingInfoListHandler() {
	ipcMain.handle(IPC_CHANNELS.FETCH_SELL_TIMING, async () => await getSellTimingInfoList())
}

async function handleExecBinWithEnv() {
	ipcMain.handle(
		IPC_CHANNELS.EXEC_FUEL_WITH_ENV,
		async (
			_event,
			args: string[],
			action: string,
			kernel = "default",
			extraEnv?: string,
		): Promise<{ message: string; code: number }> => {
			try {
				await execBin(args, action, kernel, extraEnv)

				return (await getJsonDataFromFile(
					["real_trading", "msg.json"],
					"选股策略文件不存在或为空",
					{},
				)) as { message: string; code: number }
			} catch (error) {
				logger.error(`执行 ${action} 失败: ${error}`)
				return {
					code: 400,
					message: `执行${action}失败`,
				}
			}
		},
	)
}

async function handleLoadAccount() {
	ipcMain.handle(IPC_CHANNELS.LOAD_ACCOUNT, async () => {
		return await getJsonDataFromFile(
			["real_trading", "rocket", "data", "account.json"],
			"获取账户信息失败",
		)
	})
}

async function handleFetchRocketStatus() {
	ipcMain.handle(IPC_CHANNELS.FETCH_ROCKET_STATUS, async () => {
		return await isKernalRunning("rocket", true)
	})
}

// -- S4：以下两个 handler 自 file-sys-ipc.ts 归位（桥方法 killRocket/checkDBFile 属 data 域），逻辑零改动
async function killRocketHandler(): Promise<void> {
	ipcMain.handle(IPC_CHANNELS.KILL_ROCKET, async () => {
		await killKernalByForce("rocket")
	})
}

async function checkDBFileHandler(): Promise<void> {
	ipcMain.handle(IPC_CHANNELS.CHECK_DB_FILE, async () => {
		const dbPath = await store.getAllDataPath(
			["code", "data", "FuelBinStat.db"],
			false,
		)
		return fs.existsSync(dbPath)
	})
}

async function handleFuelStatus() {
	ipcMain.handle(IPC_CHANNELS.FUEL_STATUS, async () => {
		return await isKernalRunning("fuel")
	})
}

async function handleLoadAquaTradingInfo() {
	ipcMain.handle(IPC_CHANNELS.LOAD_AQUA_TRADING_INFO, async () => {
		return await getJsonDataFromFile(
			["real_trading", "data", "trading_info.json"],
			"获取交易信息失败",
		)
	})
}

async function handleExecMinData() {
	ipcMain.handle(IPC_CHANNELS.EXEC_MIN_DATA, async (_event, mode: "fast" | "stable") => {
		try {
			const args = mode === "stable" ? ["min_data", "thread"] : ["min_data"]
			const action =
				mode === "stable"
					? "获取准确QMT数据-稳定模式"
					: "获取准确QMT数据-极速模式"

			await execBin(args, action)
			return { code: 200, message: `${action}执行完毕` }
		} catch (error) {
			logger.error(`[min-data] 执行准确QMT数据获取失败: ${error}`)
			return {
				code: 400,
				message: error instanceof Error ? error.message : "执行失败",
			}
		}
	})
}

async function handleExecMinDataFuzzy() {
	ipcMain.handle(IPC_CHANNELS.EXEC_MIN_DATA_FUZZY, async () => {
		try {
			await execBin(["min_data_fuzzy"], "获取模糊QMT数据")
			return { code: 200, message: "获取模糊QMT数据执行完毕" }
		} catch (error) {
			logger.error(`[min-data] 执行模糊QMT数据获取失败: ${error}`)
			return {
				code: 400,
				message: error instanceof Error ? error.message : "执行失败",
			}
		}
	})
}

async function handleGetMinDataTaskStats() {
	ipcMain.handle(
		IPC_CHANNELS.GET_MIN_DATA_TASK_STATS,
		async (
			_event,
			tableType: "accurate" | "fuzzy",
			runDate?: string,
			runIndex?: number,
		) => {
			const tableName =
				tableType === "accurate"
					? "min_data_update_task"
					: "min_data_fuzzy_update_task"

			const dbManager = DBManager.getInstance()
			const db = await dbManager.getConnection([tableName])
			if (!db)
				return {
					runDate: null,
					runIndex: null,
					availableRunIndexes: [],
					statusCounts: {},
					total: 0,
					error: "数据库不可用",
				}

			const date = runDate ?? new Date().toISOString().slice(0, 10)

			try {
				const indexRows = db
					.prepare(
						`SELECT DISTINCT run_index FROM ${tableName} WHERE run_date = ? ORDER BY run_index DESC`,
					)
					.all(date) as { run_index: number }[]
				const availableRunIndexes = indexRows.map((r) => r.run_index)

				let targetIndex: number
				if (runIndex !== undefined && runIndex !== null) {
					targetIndex = runIndex
				} else if (indexRows.length > 0) {
					targetIndex = indexRows[0].run_index
				} else {
					return {
						runDate: date,
						runIndex: null,
						availableRunIndexes,
						statusCounts: {},
						total: 0,
					}
				}

				const rows = db
					.prepare(
						`SELECT status, COUNT(*) as count FROM ${tableName} WHERE run_date = ? AND run_index = ? GROUP BY status`,
					)
					.all(date, targetIndex) as { status: string; count: number }[]

				const statusCounts: Record<string, number> = {}
				let total = 0
				for (const row of rows) {
					statusCounts[row.status] = row.count
					total += row.count
				}

				return {
					runDate: date,
					runIndex: targetIndex,
					availableRunIndexes,
					statusCounts,
					total,
				}
			} catch (error) {
				logger.error(`[min-data] 查询 ${tableName} 统计失败: ${error}`)
				return {
					runDate: date,
					runIndex: null,
					availableRunIndexes: [],
					statusCounts: {},
					total: 0,
					error: error instanceof Error ? error.message : String(error),
				}
			}
		},
	)
}

async function handleGetMinDataTaskStatus() {
	ipcMain.handle(
		IPC_CHANNELS.GET_MIN_DATA_TASK_STATUS,
		async (
			_event,
			tableType: "accurate" | "fuzzy",
			params: {
				runDate?: string
				runIndex?: number
				status?: string
				search?: string
				page: number
				pageSize: number
			},
		) => {
			const tableName =
				tableType === "accurate"
					? "min_data_update_task"
					: "min_data_fuzzy_update_task"

			const dbManager = DBManager.getInstance()
			const db = await dbManager.getConnection([tableName])
			if (!db)
				return {
					datalist: [],
					total: 0,
					error: "数据库不可用",
				}

			const date = params.runDate ?? new Date().toISOString().slice(0, 10)

			try {
				const indexRows = db
					.prepare(
						`SELECT DISTINCT run_index FROM ${tableName} WHERE run_date = ? ORDER BY run_index DESC`,
					)
					.all(date) as { run_index: number }[]

				let targetIndex: number
				if (params.runIndex !== undefined && params.runIndex !== null) {
					targetIndex = params.runIndex
				} else if (indexRows.length > 0) {
					targetIndex = indexRows[0].run_index
				} else {
					return { datalist: [], total: 0 }
				}

				const conditions = ["run_date = ?", "run_index = ?"]
				const values: (string | number)[] = [date, targetIndex]

				if (params.status) {
					conditions.push("status = ?")
					values.push(params.status)
				}
				if (params.search) {
					conditions.push("stock_code LIKE ?")
					values.push(`%${params.search}%`)
				}

				const whereClause = conditions.join(" AND ")

				const countRow = db
					.prepare(
						`SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`,
					)
					.get(...values) as { count: number }

				const offset = (params.page - 1) * params.pageSize
				const datalist = db
					.prepare(
						`SELECT * FROM ${tableName} WHERE ${whereClause} ORDER BY id LIMIT ? OFFSET ?`,
					)
					.all(...values, params.pageSize, offset) as Record<string, unknown>[]

				return {
					datalist,
					total: countRow.count,
				}
			} catch (error) {
				logger.error(`[min-data] 查询 ${tableName} 状态失败: ${error}`)
				return {
					datalist: [],
					total: 0,
					error: error instanceof Error ? error.message : String(error),
				}
			}
		},
	)
}

export const regDataIPC = () => {
	handleFuelStatus()
	handleLoadAccount()
	queryDataListHandler()
	handleExecBinWithEnv()
	handleExecDownloadZip()
	getStrategySelectData()
	getBuyInfoListHandler()
	getSellInfoListHandler()
	getBuyTimingInfoListHandler()
	getSellTimingInfoListHandler()
	handleUpdateStrategies()
	handleUpdateOneProduct()
	handleFetchRocketStatus()
	killRocketHandler()
	checkDBFileHandler()
	handleLoadProductStatus()
	handleUpdateFullProducts()
	handleLoadAquaTradingInfo()
	handleExecMinData()
	handleExecMinDataFuzzy()
	handleGetMinDataTaskStats()
	handleGetMinDataTaskStatus()
	console.log("[reg] data-ipc")
}
