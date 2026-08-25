export const SETTINGS = "settings"
export const LIBRARY_TYPE = `${SETTINGS}.libraryType`
export const SELECT_STOCK_STRATEGY_CONFIG = "select_stock"
export const POS_MGMT_STRATEGY_CONFIG = "pos_mgmt"

export const NOTIFICATION_REPORT_CODE = 800

// -- 通知来源
export const NOTIFICATION_SOURCES = [
	"fuel",
	"rocket",
	"fusion",
	"aqua",
] as const
export type NotificationSource = (typeof NOTIFICATION_SOURCES)[number]

// -- 通知级别
export const NOTIFICATION_LEVELS = [
	"info",
	"success",
	"warning",
	"error",
] as const
export type NotificationLevel = (typeof NOTIFICATION_LEVELS)[number]
