/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { NOTIFICATION_REPORT_CODE } from "@/shared/constants"

export * from "./contributors"

// 应用版本年份
export const APP_VERSION_YEAR = 2026
// 首页
export const HOME_PAGE = "/"
// 数据
export const DATA_PAGE = "/data"
// 策略
export const STRATEGY_PAGE = "/strategy"
// 实时数据
export const REALTIME_DATA_PAGE = "/realtime_data"
// 数据设置
export const DATA_SETTING_PAGE = "/setting"
// 选股策略
export const SELECT_STOCK_STRATEGY_PAGE = "/select_stock_strategy"
// 当日交易
export const TRADING_PLAN_PAGE = "/trading_plan"
// 实盘配置
export const REAL_MARKET_CONFIG_PAGE = "/real_market_config"
// 持仓信息
export const POSITION_INFO_PAGE = "/position_info"
// 选股策略库
export const STRATEGY_LIBRARY_PAGE = "/strategy_library"
// 综合策略库
export const FUSION_STRATEGY_LIBRARY_PAGE = "/fusion_strategy_library"
// 研究中心 - 精心随机策略库
export const RESEARCH_STRATEGY_LIBRARY_PAGE = "/strategy_repo"
// 研究中心 - 框架源码
export const RESEARCH_FRAMEWORK_SOURCE_PAGE = "/framework_repo"
// 策略试跑
export const BACKTEST_PAGE = "/backtest"
// 常见问题解答
export const FAQ_PAGE = "/faq"
// 设置
export const SETTINGS_PAGE = "/settings"

// 板块容器路由
export const DATA_SECTION_ROUTE = "/data-section"
export const TRADING_SECTION_ROUTE = "/trading-section"
export const RESEARCH_SECTION_ROUTE = "/research-section"
// 问题反馈
export const QUESTION_FEEDBACK_PAGE = "https://bbs.quantclass.cn/thread/48835"

export const DATA_SECTION_PAGE = [
	DATA_PAGE,
	STRATEGY_PAGE,
	DATA_SETTING_PAGE,
	REALTIME_DATA_PAGE,
	DATA_SECTION_ROUTE,
]
export const REAL_TRADING_SECTION_PAGE = [
	TRADING_PLAN_PAGE,
	POSITION_INFO_PAGE,
	REAL_MARKET_CONFIG_PAGE,
	SELECT_STOCK_STRATEGY_PAGE,
	STRATEGY_LIBRARY_PAGE,
	FUSION_STRATEGY_LIBRARY_PAGE,
	BACKTEST_PAGE,
	TRADING_SECTION_ROUTE,
]
export const RESEARCH_SECTION_PAGE = [
	RESEARCH_STRATEGY_LIBRARY_PAGE,
	RESEARCH_FRAMEWORK_SOURCE_PAGE,
	RESEARCH_SECTION_ROUTE,
]

export const TRADING_MAIN_PAGE = TRADING_SECTION_ROUTE

// -- 选股 config
export const SELECT_STOCK_STRATEGY_CONFIG = "select_stock"
export const POS_MGMT_STRATEGY_CONFIG = "pos_mgmt"

export const DATA_TAB_NAME = "data"
export const REAL_TRADING_TAB_NAME = "real_trading"
export const RESEARCH_TAB_NAME = "research"

// BASE_URL 已移至环境变量 VITE_BASE_URL，请直接使用 import.meta.env.VITE_BASE_URL

export const isWindows = window.electron.process.platform === "win32"
export const { ipcRenderer: _ipcRenderer } = window.electron

export const RENDERER_MSG_CODE = {
	// 更新通知
	UPDATE_NOTICE: 500,
	// 更新不可用/已是最新
	UPDATE_NOT_AVAILABLE: 501,
	// 安装失败
	UPDATE_INSTALL_FAILED: 502,
	// 更新下载完毕，提示安装更新
	UPDATE_DOWNLOAD_FINISH: 503,
	// 回测使用代码
	BACKTEST_CODE: 504,
	// 计算交易计划
	CALC_TRADING_PLAN: 600,
	// Real Trading 正在运行中
	REAL_TRADING_RUNNING: 700,
	// 内核通知（来自 POST /notify）
	NOTIFICATION: NOTIFICATION_REPORT_CODE,
}

export enum RebalanceTime {
	open = "日内早盘",
	close = "日内尾盘",
	"close-open" = "隔日换仓",
}
