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
	runClientInit: () => ipcRenderer.invoke("run-client-init"),
	getSelectedStrategiesList: () =>
		ipcRenderer.invoke("get-selected-strategies-list"),
	getTradingPlanList: () => ipcRenderer.invoke("fetch_trading"),
	execFuelWithEnv: (
		args: string[],
		action: string,
		kernel: string,
		extraEnv?: string,
	) => ipcRenderer.invoke("exec-fuel-with-env", args, action, kernel, extraEnv),
	rocketExecute: () => ipcRenderer.invoke("rocket-execute"),
	// TODO: 需要迁移到trading.ts

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
	loadRunResult: () => ipcRenderer.invoke("load-run-result"),
	getStrategyResultPath: (mode = "backtest") =>
		ipcRenderer.invoke("strategy-result-path", mode),

	// 交易计划
	getBuyInfoList: () => ipcRenderer.invoke("fetch_buy"),
	getSellInfoList: () => ipcRenderer.invoke("fetch_sell"),

	// 数据库
	checkDBFile: () => ipcRenderer.invoke("check-db-file"),

	// 监控
	fetchMonitorProcesses: () => ipcRenderer.invoke("fetch-monitor-processes"),

	// 导入功能
	parseCsvFile: (csvfileName = "最新选股结果", mode = "backtest") =>
		ipcRenderer.invoke("parse-csv-file", csvfileName, mode),
}
