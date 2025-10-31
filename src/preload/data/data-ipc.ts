/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import {
	getBuyInfoList,
	getDataList,
	getJsonDataFromFile,
	getSelectedStrategiesList,
	getSellInfoList,
	getTradingPlanList,
} from "@/main/core/dataList.js"
import {
	downloadFullData,
	updateFullProducts,
	updateProduct,
} from "@/main/core/product.js"
import { updateStrategies } from "@/main/core/strategy/index.js"
import { execBin } from "@/main/lib/process.js"
import { isKernalRunning } from "@/main/utils/tools.js"
import logger from "@/main/utils/wiston.js"
import { ipcMain } from "electron"

async function handleLoadProductStatus() {
	ipcMain.handle("load-product-status", async () => {
		logger.info("load-product-status")

		return await getJsonDataFromFile(
			["code", "data", "products-status.json"],
			"获取订阅数据信息失败",
			{},
		)
	})
}

async function handleExecDownloadZip() {
	ipcMain.handle("exec-download-zip", async (_event, product_name: string) => {
		try {
			return await downloadFullData(product_name)
		} catch (error) {
			logger.error(`exec-download-zip ${product_name} error: ${error}`)
			throw new Error("数据 zip 下载失败")
		}
	})
}

async function handleUpdateOneProduct() {
	ipcMain.handle(
		"update-one-product",
		async (_event, product?: string) => await updateProduct(product),
	)
}

async function handleUpdateFullProducts() {
	ipcMain.handle(
		"update-full-products",
		async (_event, product_name: string, full_data_name?: string) =>
			await updateFullProducts(product_name, full_data_name),
	)
}

async function handleUpdateStrategies() {
	ipcMain.handle("update-strategies", async (_event, strategy?: string) => {
		await updateStrategies(strategy)
	})
}

async function getStrategySelectData() {
	ipcMain.handle("strategy-select-data", async () => {
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
		"query-data-list",
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

async function fetchSelectedStrategiesList() {
	ipcMain.handle(
		"get-selected-strategies-list",
		async () => await getSelectedStrategiesList(),
	)
}

async function getTradingPlanListHandler() {
	ipcMain.handle("fetch_trading", async () => await getTradingPlanList())
}

async function getBuyInfoListHandler() {
	ipcMain.handle("fetch_buy", async () => await getBuyInfoList())
}

async function getSellInfoListHandler() {
	ipcMain.handle("fetch_sell", async () => await getSellInfoList())
}

async function handleExecBinWithEnv() {
	ipcMain.handle(
		"exec-fuel-with-env",
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

async function handleRocketExecute() {
	ipcMain.handle("rocket-execute", async () => {
		try {
			const is_rocket_running = await isKernalRunning("rocket", true)
			if (is_rocket_running) {
				logger.warn("手动运行，但 Rocket 正在运行中，跳出操作")
				return { code: 300, message: "Rocket 正在运行中，请勿重复点击运行" }
			}

			await execBin(["run"], "启动 rocket", "rocket")
			return {
				code: 200,
				message: "启动 rocket 成功",
			}
		} catch (error) {
			logger.error(`运行 rocket 失败: ${error}`)
			return {
				code: 400,
				message: "运行 rocket 失败",
			}
		}
	})
}

async function handleLoadPosition() {
	ipcMain.handle("load-position", async () => {
		return await getJsonDataFromFile(
			["real_trading", "rocket", "data", "position.json"],
			"获取持仓信息失败",
		)
	})
}

async function handleLoadAccount() {
	ipcMain.handle("load-account", async () => {
		return await getJsonDataFromFile(
			["real_trading", "rocket", "data", "account.json"],
			"获取账户信息失败",
		)
	})
}

async function handleLoadRunResult() {
	ipcMain.handle("load-run-result", async () => {
		return await getJsonDataFromFile(
			["real_trading", "trade_info_test.json"],
			"获取运行结果失败",
		)
	})
}

async function handleFetchRocketStatus() {
	ipcMain.handle("fetch-rocket-status", async () => {
		return await isKernalRunning("rocket", true)
	})
}

async function handleFuelStatus() {
	ipcMain.handle("fuel-status", async () => {
		return await isKernalRunning("fuel")
	})
}

async function handleLoadAquaTradingInfo() {
	ipcMain.handle("load-aqua-trading-info", async () => {
		return await getJsonDataFromFile(
			["real_trading", "data", "trading_info.json"],
			"获取交易信息失败",
		)
	})
}

export const regDataIPC = () => {
	handleFuelStatus()
	handleLoadAccount()
	handleLoadPosition()
	handleLoadRunResult()
	handleRocketExecute()
	queryDataListHandler()
	handleExecBinWithEnv()
	handleExecDownloadZip()
	getStrategySelectData()
	getBuyInfoListHandler()
	getSellInfoListHandler()
	handleUpdateStrategies()
	handleUpdateOneProduct()
	handleFetchRocketStatus()
	handleLoadProductStatus()
	handleUpdateFullProducts()
	getTradingPlanListHandler()
	fetchSelectedStrategiesList()
	handleLoadAquaTradingInfo()
	console.log("[reg] data-ipc")
}
