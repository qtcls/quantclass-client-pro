/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

// -- power-status 推送的系统电源状态（由主进程 powerMonitor 发送）
export type PowerStatus = "suspend" | "resume"

// -- send-schedule-status 推送的内核运行状态（由主进程 scheduler 发送，preload 桥转译给 renderer）
export type LoopStatus =
	| "init"
	| "error"
	| "start"
	| "outline"
	| "done"
	| "fuel_start"
	| "aqua_start"
	| "noTradingConfig"
	| "noTradingTime"
	| "rocket_start"
