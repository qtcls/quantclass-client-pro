/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { ipcRenderer } from "electron"

export const dataIPC = {
	// 原有方法
	handleExecDownloadZip: (product_name: string) =>
		ipcRenderer.invoke("exec-download-zip", product_name),
	handleUpdateOneProduct: (product?: string) =>
		ipcRenderer.invoke("update-one-product", product),
	handleUpdateFullProducts: (product_name: string, full_data_name?: string) =>
		ipcRenderer.invoke("update-full-products", product_name, full_data_name),
	handleUpdateStrategies: (strategy?: string) =>
		ipcRenderer.invoke("update-strategies", strategy),
	getStrategySelectData: () => ipcRenderer.invoke("strategy-select-data"),
	queryDataList: (params: {
		cur: number
		pageSize: number
		file_name: string
	}) => ipcRenderer.invoke("query-data-list", params),
	execFuelWithEnv: (
		args: string[],
		action: string,
		kernel: string,
		extraEnv?: string,
	) => ipcRenderer.invoke("exec-fuel-with-env", args, action, kernel, extraEnv),
	// 从renderer/ipc/index.ts迁移的方法
	rendererLog: (type: "info" | "error" | "warning", msg: string) =>
		ipcRenderer.invoke("do-renderer-log", type, msg),

	// 账户相关
	loadAccount: () => ipcRenderer.invoke("load-account"),

	// 状态查询
	fetchRocketStatus: () => ipcRenderer.invoke("fetch-rocket-status"),
	killRocket: () => ipcRenderer.invoke("kill-rocket"),
	fetchFuelStatus: () => ipcRenderer.invoke("fuel-status"),

	// 产品状态
	loadProductStatus: () =>
		ipcRenderer.invoke("load-product-status") as Promise<
			Partial<Record<string, any>>
		>,

	// 运行结果
	getStrategyResultPath: (mode = "backtest") =>
		ipcRenderer.invoke("strategy-result-path", mode),

	// 交易计划
	getBuyInfoList: () => ipcRenderer.invoke("fetch_buy"),
	getSellInfoList: () => ipcRenderer.invoke("fetch_sell"),
	getBuyTimingInfoList: () => ipcRenderer.invoke("fetch_buy_timing"),
	getSellTimingInfoList: () => ipcRenderer.invoke("fetch_sell_timing"),

	// 数据库
	checkDBFile: () => ipcRenderer.invoke("check-db-file"),

	// 实时数据（QMT 分钟数据）
	execMinData: (mode: "fast" | "stable") =>
		ipcRenderer.invoke("exec-min-data", mode) as Promise<{
			code: number
			message: string
		}>,
	getMinDataTaskStats: (runDate?: string, runIndex?: number) =>
		ipcRenderer.invoke(
			"get-min-data-task-stats",
			runDate,
			runIndex,
		) as Promise<{
			runDate: string | null
			runIndex: number | null
			availableRunIndexes: number[]
			statusCounts: Record<string, number>
			total: number
			error?: string
		}>,
	getMinDataTaskStatus: (params: {
		runDate?: string
		runIndex?: number
		status?: string
		search?: string
		page: number
		pageSize: number
	}) =>
		ipcRenderer.invoke("get-min-data-task-status", params) as Promise<{
			datalist: Record<string, unknown>[]
			total: number
			error?: string
		}>,
	deleteMinDataToday: () =>
		ipcRenderer.invoke("delete-min-data-today") as Promise<{
			success: boolean
			message?: string
			minDataDeleted?: number
			taskDeleted?: number
			runDate?: string
		}>,

	// 监控
	fetchMonitorProcesses: () => ipcRenderer.invoke("fetch-monitor-processes"),

	// 交易日历（period_offset.csv）
	getTradingDays: () =>
		ipcRenderer.invoke("load-trading-days") as Promise<string[]>,

	// 导入功能
	parseCsvFile: (csvfileName = "最新选股结果", mode = "backtest") =>
		ipcRenderer.invoke("parse-csv-file", csvfileName, mode),

	// 下载进度监听
	onDownloadProgress: (
		callback: (progress: {
			product_name: string
			transferred: number
			total: number
			percent: number
			bytesPerSecond: number
		}) => void,
	) => {
		ipcRenderer.on("download-progress", (_event, progress) => {
			console.log("[下载进度]", progress)
			callback(progress)
		})
	},
	removeDownloadProgressListener: () => {
		ipcRenderer.removeAllListeners("download-progress")
	},
}
