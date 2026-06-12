/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import { subscribeWithCleanup } from "@/shared/lib/ipc-subscription.js"
import { ipcRenderer } from "electron"

export const dataIPC = {
	// 原有方法
	handleExecDownloadZip: (product_name: string) =>
		ipcRenderer.invoke(IPC_CHANNELS.EXEC_DOWNLOAD_ZIP, product_name),
	handleUpdateOneProduct: (product?: string) =>
		ipcRenderer.invoke(IPC_CHANNELS.UPDATE_ONE_PRODUCT, product),
	handleUpdateFullProducts: (product_name: string, full_data_name?: string) =>
		ipcRenderer.invoke(
			IPC_CHANNELS.UPDATE_FULL_PRODUCTS,
			product_name,
			full_data_name,
		),
	handleUpdateStrategies: (strategy?: string) =>
		ipcRenderer.invoke(IPC_CHANNELS.UPDATE_STRATEGIES, strategy),
	getStrategySelectData: () =>
		ipcRenderer.invoke(IPC_CHANNELS.STRATEGY_SELECT_DATA),
	queryDataList: (params: {
		cur: number
		pageSize: number
		file_name: string
	}) => ipcRenderer.invoke(IPC_CHANNELS.QUERY_DATA_LIST, params),
	execFuelWithEnv: (
		args: string[],
		action: string,
		kernel: string,
		extraEnv?: string,
	) =>
		ipcRenderer.invoke(
			IPC_CHANNELS.EXEC_FUEL_WITH_ENV,
			args,
			action,
			kernel,
			extraEnv,
		),
	// 从renderer/ipc/index.ts迁移的方法
	rendererLog: (type: "info" | "error" | "warning", msg: string) =>
		ipcRenderer.invoke(IPC_CHANNELS.DO_RENDERER_LOG, type, msg),

	// 账户相关
	loadAccount: () => ipcRenderer.invoke(IPC_CHANNELS.LOAD_ACCOUNT),

	// 状态查询
	fetchRocketStatus: () => ipcRenderer.invoke(IPC_CHANNELS.FETCH_ROCKET_STATUS),
	killRocket: () => ipcRenderer.invoke(IPC_CHANNELS.KILL_ROCKET),
	fetchFuelStatus: () => ipcRenderer.invoke(IPC_CHANNELS.FUEL_STATUS),

	// 产品状态
	loadProductStatus: () =>
		ipcRenderer.invoke(IPC_CHANNELS.LOAD_PRODUCT_STATUS) as Promise<
			Partial<Record<string, any>>
		>,

	// 运行结果
	getStrategyResultPath: (mode = "backtest") =>
		ipcRenderer.invoke(IPC_CHANNELS.STRATEGY_RESULT_PATH, mode),

	// 交易计划
	getBuyInfoList: () => ipcRenderer.invoke(IPC_CHANNELS.FETCH_BUY),
	getSellInfoList: () => ipcRenderer.invoke(IPC_CHANNELS.FETCH_SELL),
	getBuyTimingInfoList: () => ipcRenderer.invoke(IPC_CHANNELS.FETCH_BUY_TIMING),
	getSellTimingInfoList: () =>
		ipcRenderer.invoke(IPC_CHANNELS.FETCH_SELL_TIMING),

	// 数据库
	checkDBFile: () => ipcRenderer.invoke(IPC_CHANNELS.CHECK_DB_FILE),

	// 实时数据（QMT 分钟数据）
	execMinData: (mode: "fast" | "stable") =>
		ipcRenderer.invoke(IPC_CHANNELS.EXEC_MIN_DATA, mode) as Promise<{
			code: number
			message: string
		}>,
	execMinDataFuzzy: () =>
		ipcRenderer.invoke(IPC_CHANNELS.EXEC_MIN_DATA_FUZZY) as Promise<{
			code: number
			message: string
		}>,
	getMinDataTaskStats: (
		tableType: "accurate" | "fuzzy",
		runDate?: string,
		runIndex?: number,
	) =>
		ipcRenderer.invoke(
			IPC_CHANNELS.GET_MIN_DATA_TASK_STATS,
			tableType,
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
	getMinDataTaskStatus: (
		tableType: "accurate" | "fuzzy",
		params: {
			runDate?: string
			runIndex?: number
			status?: string
			search?: string
			page: number
			pageSize: number
		},
	) =>
		ipcRenderer.invoke(
			IPC_CHANNELS.GET_MIN_DATA_TASK_STATUS,
			tableType,
			params,
		) as Promise<{
			datalist: Record<string, unknown>[]
			total: number
			error?: string
		}>,

	// 监控
	fetchMonitorProcesses: () =>
		ipcRenderer.invoke(IPC_CHANNELS.FETCH_MONITOR_PROCESSES),

	// 导入功能
	parseCsvFile: (csvfileName = "最新选股结果", mode = "backtest") =>
		ipcRenderer.invoke(IPC_CHANNELS.PARSE_CSV_FILE, csvfileName, mode),

	// 下载进度监听（payload-only），返回只移除本次订阅的退订函数
	onDownloadProgress: (
		callback: (progress: {
			product_name: string
			transferred: number
			total: number
			percent: number
			bytesPerSecond: number
		}) => void,
	): (() => void) =>
		subscribeWithCleanup(
			ipcRenderer,
			IPC_CHANNELS.DOWNLOAD_PROGRESS,
			(_event, progress) => {
				console.log("[下载进度]", progress)
				callback(progress)
			},
		),
}
