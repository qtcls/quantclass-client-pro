export const SETTINGS = "settings"
export const LIBRARY_TYPE = `${SETTINGS}.libraryType`
export const SELECT_STOCK_STRATEGY_CONFIG = "select_stock"
export const POS_MGMT_STRATEGY_CONFIG = "pos_mgmt"

// -- 内核回调服务端口（main 写入 / renderer 与 main 读取的 store key 及默认值）
export const SERVER_PORT_KEY = "server_port"
export const DEFAULT_SERVER_PORT = 8787

// -- main → renderer 消息码表（wire 值，500-700 段；单源，两侧 MAIN_MSG_CODE /
// -- RENDERER_MSG_CODE 均由此派生，值不可改）
export const MSG_CODE = {
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
}

export const NOTIFICATION_REPORT_CODE = 800

// -- 通知来源
export const NOTIFICATION_SOURCES = ["fuel", "rocket", "aqua", "zeus"] as const
export type NotificationSource = (typeof NOTIFICATION_SOURCES)[number]

// -- 通知级别
export const NOTIFICATION_LEVELS = [
	"info",
	"success",
	"warning",
	"error",
] as const
export type NotificationLevel = (typeof NOTIFICATION_LEVELS)[number]
