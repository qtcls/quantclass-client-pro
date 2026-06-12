/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

/**
 * IPC 频道名唯一来源（S4）。
 *
 * 规则（违背任意一条都会破坏跨进程 wire 契约）：
 * 1. 值 = wire string，逐字节冻结：改值即破坏新旧版本互通，禁止改名；
 *    历史遗留的 kebab / colon / snake 三套命名现状保留，新频道建议用 colon 域前缀。
 * 2. 键名由值机械派生：value.toUpperCase() 且 `:`/`-` → `_`（snake 原样大写），
 *    一一对应、可逆，禁止人为起别名。
 * 3. 本文件不 import 任何模块（被 main / preload / renderer 三个 bundle 共享，零依赖零环）。
 * 4. 生产代码中频道字符串只允许出现在本文件；调用点一律 import 常量。
 *
 * 已知例外（勿"顺手修正"）：
 * - electron-updater 的 `autoUpdater.on("download-progress")` 是 EventEmitter 事件名，
 *   与 DOWNLOAD_PROGRESS 频道同名纯属巧合，不是 IPC，不要替换成本常量。
 */
export const IPC_CHANNELS = {
	// ── store 域（handler: src/main/ipc/store-ipc.ts）──
	SET_STORE: "set-store",
	GET_STORE: "get-store",
	DELETE_STORE: "delete-store",
	SAVE_REAL_MARKET_CONFIG: "save-real-market-config",

	// ── core 域（handler: src/main/ipc/core-ipc.ts）──
	TOGGLE_HANDLE: "toggle-handle",
	SET_AUTO_TRADING: "set-auto-trading",
	SYNC_NETWORK_STATUS: "sync-network-status",
	GET_MAC_ADDRESS: "get-mac-address",
	TOGGLE_MIN_DATA_SCHEDULE: "toggle-min-data-schedule",

	// ── data 域（handler: src/main/ipc/data-ipc.ts）──
	LOAD_PRODUCT_STATUS: "load-product-status",
	EXEC_DOWNLOAD_ZIP: "exec-download-zip",
	UPDATE_ONE_PRODUCT: "update-one-product",
	UPDATE_FULL_PRODUCTS: "update-full-products",
	UPDATE_STRATEGIES: "update-strategies",
	STRATEGY_SELECT_DATA: "strategy-select-data",
	QUERY_DATA_LIST: "query-data-list",
	FETCH_BUY: "fetch_buy",
	FETCH_SELL: "fetch_sell",
	FETCH_BUY_TIMING: "fetch_buy_timing",
	FETCH_SELL_TIMING: "fetch_sell_timing",
	EXEC_FUEL_WITH_ENV: "exec-fuel-with-env",
	LOAD_ACCOUNT: "load-account",
	FETCH_ROCKET_STATUS: "fetch-rocket-status",
	FUEL_STATUS: "fuel-status",
	LOAD_AQUA_TRADING_INFO: "load-aqua-trading-info",
	EXEC_MIN_DATA: "exec-min-data",
	EXEC_MIN_DATA_FUZZY: "exec-min-data-fuzzy",
	GET_MIN_DATA_TASK_STATS: "get-min-data-task-stats",
	GET_MIN_DATA_TASK_STATUS: "get-min-data-task-status",
	KILL_ROCKET: "kill-rocket",
	CHECK_DB_FILE: "check-db-file",
	/** main → renderer：完整数据 zip 下载进度（与 autoUpdater 同名事件无关，见文件头） */
	DOWNLOAD_PROGRESS: "download-progress",

	// ── file-sys 域（handler: src/main/ipc/file-sys-ipc.ts）──
	STRATEGY_RESULT_PATH: "strategy-result-path",
	CREATE_REAL_TRADING_DIR: "create-real-trading-dir",
	OPEN_DIRECTORY_SELECT: "open-directory-select",
	OPEN_DIRECTORY: "open-directory",
	OPEN_DATA_DIRECTORY: "open-data-directory",
	OPEN_USER_DIRECTORY: "open-user-directory",
	OPEN_URL: "open-url",
	SAVE_REAL_MARKET_DATA: "save-real-market-data",
	CLEAN_REAL_MARKET_DATA: "clean-real-market-data",
	CLEAR_REAL_MARKET_DATA: "clear-real-market-data",
	IMPORT_SELECT_STOCK: "import-select-stock",
	IMPORT_FUSION: "import-fusion",
	PARSE_CSV_FILE: "parse-csv-file",
	READ_CHANGELOG: "read-changelog",
	LOAD_POSITION_JSON: "load-position-json",
	CLEAR_FACTOR_CACHE: "clear-factor-cache",
	DELETE_PERIOD_OFFSET: "delete-period-offset",

	// ── auth 域（handler: src/main/ipc/auth-ipc.ts；session-invalid 由 tokenStore 推送）──
	AUTH_SET_TOKENS: "auth:set-tokens",
	AUTH_GET_ACCESS_TOKEN: "auth:get-access-token",
	AUTH_FORCE_REFRESH: "auth:force-refresh",
	AUTH_LOGOUT: "auth:logout",
	AUTH_SESSION_INVALID: "auth:session-invalid",

	// ── kernel-log 域（handler: src/main/ipc/kernel-log-ipc.ts）──
	WATCH_KERNEL_LOG: "watch-kernel-log",
	UNWATCH_KERNEL_LOG: "unwatch-kernel-log",
	WATCH_INDIVIDUAL_KERNEL_LOG: "watch-individual-kernel-log",
	UNWATCH_INDIVIDUAL_KERNEL_LOG: "unwatch-individual-kernel-log",
	KERNEL_LOG_CHANGED: "kernel-log-changed",
	KERNEL_LOG_CHANGED_INDIVIDUAL: "kernel-log-changed-individual",

	// ── windows 域（handler: src/main/ipc/windows-ipc.ts）──
	CREATE_TERMINAL_WINDOW: "create-terminal-window",
	FOCUS_MAIN_WINDOWS: "focus-main-windows",

	// ── migration 域（handler: src/main/ipc/migration-ipc.ts）──
	GET_PENDING_RENDERER_MIGRATIONS: "get-pending-renderer-migrations",
	MARK_MIGRATION_DONE: "mark-migration-done",

	// ── user 域（handler: src/main/ipc/user-ipc.ts）──
	SYNC_USER_STATE: "sync-user-state",
	GET_USER_ACCOUNT: "get-user-account",
	CLEAR_USER_STATE: "clear-user-state",

	// ── system 域（handler: src/main/ipc/system-ipc.ts）──
	TOGGLE_FULLSCREEN: "toggle-fullscreen",
	SET_IS_AUTO_LOGIN: "set-is-auto-login",
	MINIMIZE_APP: "minimize-app",
	CLOSE_APP: "close-app",
	FETCH_FULLSCREEN_STATE: "fetch-fullscreen-state",
	FETCH_MONITOR_PROCESSES: "fetch-monitor-processes",
	CHECK_KERNAL_RUNNING: "check-kernal-running",
	KILL_PROCESS: "kill-process",
	KILL_ALL_KERNALS: "kill-all-kernals",
	KILL_KERNAL: "kill-kernal",
	DO_RENDERER_LOG: "do-renderer-log",
	RESTART_APP: "restart-app",
	CHECK_UPDATE: "check-update",
	GET_APP_AND_KERNAL_VERSIONS: "get-app-and-kernal-versions",
	UPDATE_KERNAL: "update-kernal",
	/** renderer → main：全局错误日志（ipcRenderer.send 单向） */
	LOG_ERROR: "log-error",

	// ── strategy 域（handler: src/main/ipc/strategy-ipc.ts）──
	GET_STRATEGY_STATUS: "get-strategy-status",
	GET_STOCK_TIMING_VIEW: "get-stock-timing-view",

	// ── notification 域（handler: src/main/ipc/notification-ipc.ts；new 由 server/notify 推送）──
	NOTIFICATION_LIST: "notification:list",
	NOTIFICATION_UNREAD_COUNT: "notification:unread-count",
	NOTIFICATION_MARK_READ: "notification:mark-read",
	NOTIFICATION_MARK_ALL_READ: "notification:mark-all-read",
	NOTIFICATION_NEW: "notification:new",

	// ── real-trading-backup 域（handler: src/main/ipc/real-trading-backup-ipc.ts）──
	REAL_TRADING_BACKUP_GET_CONFIG: "real-trading-backup:get-config",
	REAL_TRADING_BACKUP_SET_DAILY_TIME: "real-trading-backup:set-daily-time",
	REAL_TRADING_BACKUP_SET_ENABLED: "real-trading-backup:set-enabled",
	REAL_TRADING_BACKUP_RUN_NOW: "real-trading-backup:run-now",

	// ── repo 域（handler: src/main/ipc/repo-ipc.ts）──
	REPO_LIST_RECORDS: "repo:list-records",
	REPO_APPEND_RECORD: "repo:append-record",
	REPO_UPDATE_RECORD: "repo:update-record",
	REPO_DOWNLOAD_AND_EXTRACT: "repo:download-and-extract",
	REPO_DELETE_RECORD: "repo:delete-record",

	// ── startup-check 域（handler: src/main/ipc/startup-check-ipc.ts）──
	STARTUP_CHECK_NETWORK: "startup-check:network",
	STARTUP_CHECK_QMT: "startup-check:qmt",
	STARTUP_CHECK_DATA_ANALYZE: "startup-check:data:analyze",
	STARTUP_CHECK_DATA_ALIGN: "startup-check:data:align",
	STARTUP_CHECK_DATA_RECYCLE_BIN_LIST: "startup-check:data:recycle-bin:list",
	STARTUP_CHECK_DATA_RECYCLE_BIN_REMOVE:
		"startup-check:data:recycle-bin:remove",
	STARTUP_CHECK_DATA_RECYCLE_BIN_PURGE: "startup-check:data:recycle-bin:purge",

	// ── main 进程杂项（内联注册 / lib 模块）──
	/** main → renderer：系统休眠/唤醒（main/index.ts powerMonitor） */
	POWER_STATUS: "power-status",
	/** main → renderer：统一消息/通知（runpy/updater/server controllers 多处发送） */
	REPORT_MSG: "report-msg",
	/** main → renderer：交易调度状态机（scheduler.ts） */
	SEND_SCHEDULE_STATUS: "send-schedule-status",
	/** main → renderer：内核更新中标志（scheduler.ts） */
	SEND_UPDATE_STATUS: "send-update-status",
	/** main → renderer：分钟数据调度状态（scheduler.ts） */
	MIN_DATA_SCHEDULE_STATUS: "min-data-schedule-status",

	// ── updater 域（main/lib/updater.ts；当前 setupUpdater 未启用，频道保留）──
	/** main → renderer：应用自更新下载进度 */
	UPDATE_PROGRESS: "update-progress",
	/** renderer → main：用户确认安装更新（ipcMain.once） */
	APP_UPDATER_CONFIRM: "app-updater-confirm",
	CHECK_GITHUB_UPDATE: "check-github-update",
} as const

/** 全部合法 IPC 频道名的联合类型 */
export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
