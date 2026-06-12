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
 * 自动实盘前置条件守卫（纯函数）。
 *
 * ⚠️ 本文件必须保持纯净：禁止 import electron / window / fs / react 等任何宿主依赖。
 * 它被 renderer（enable 交互）、main cron（每分钟 tick）、main setAutoTrading（IPC 自校验）
 * 三处同源调用，作为唯一的实盘前置条件判定，消除「渲染层与主进程双重且语义不一致守卫」的分叉。
 */

export type TradingGuardCode =
	| "ok"
	| "no_strategy"
	| "zero_weight"
	| "data_not_updating"
	| "qmt_not_configured"

/**
 * QMT 实盘配置必需字段。
 * 按「key 存在性」判断而非 truthiness —— filter_cyb/filter_kcb/filter_bj 的 "0"/false
 * 是合法取值（不过滤），不能当作「字段缺失」。
 */
const REQUIRED_QMT_KEYS = [
	"qmt_path",
	"qmt_port",
	"account_id",
	"filter_cyb",
	"filter_kcb",
	"filter_bj",
] as const

/**
 * 判断单个策略节点（展开嵌套子策略后）是否存在正有效权重。
 *
 * 采用「结构化」检测（不依赖 type 字段），因为同一判定要兼容两类形态：
 * - renderer 读取的原始 `fusion` 项（带 type：group 有 strategy_list，pos 有 strategy_pool）；
 * - main 只能读 electron-store 的 `pos_mgmt.strategies` / `select_stock.strategy_list`，
 *   它们经 `genSelectStgInfo` 转换后**丢弃了 type**，仅保留 cap_weight + strategy_pool/strategy_list。
 *
 * 口径与内核展开（utils/strategy.ts saveStrategyListFusion）一致：
 * - 组合节点（pos 有 strategy_pool / group 有 strategy_list）：自身权重 > 0 **且**至少一个正权重子策略
 *   （子策略全 0 或空池 → 该组合实际不下任何单，fail-closed 视为无正权重）。
 * - 叶子：顶层缺失权重沿用历史「满仓」默认 1（保持 select 模式既有行为）；
 *   嵌套叶子缺失权重按 fail-closed 记 0。
 */
function nodeHasPositiveWeight(node: unknown, topLevel: boolean): boolean {
	if (!node || typeof node !== "object") return false
	const n = node as {
		cap_weight?: number
		strategy_pool?: unknown
		strategy_list?: unknown
	}
	const weight = n.cap_weight

	if (Array.isArray(n.strategy_pool)) {
		return (
			(weight ?? 0) > 0 &&
			n.strategy_pool.some((child) => nodeHasPositiveWeight(child, false))
		)
	}
	if (Array.isArray(n.strategy_list)) {
		return (
			(weight ?? 0) > 0 &&
			n.strategy_list.some((child) => nodeHasPositiveWeight(child, false))
		)
	}
	return (weight ?? (topLevel ? 1 : 0)) > 0
}

/**
 * 策略列表中是否存在任意正有效权重策略（展开嵌套子策略）。
 */
export function hasPositiveWeight(strategies: unknown): boolean {
	return (
		Array.isArray(strategies) &&
		strategies.some((stg) => nodeHasPositiveWeight(stg, true))
	)
}

/**
 * QMT 实盘配置是否完整、可用于自动实盘。
 * - 必需字段按 key 存在性判断（filter_* 的 "0"/false 不算缺失）。
 * - account_id 为 ""/"0"/" 0 " 视为「手动下单模式」哨兵 → 阻止自动实盘 enable。
 * - qmt_path / qmt_port 必须非空（对齐配置表单 min(1)，main 自校验不弱于 UI）。
 */
export function isQmtConfigured(config: unknown): boolean {
	if (!config || typeof config !== "object") return false
	const record = config as Record<string, unknown>
	const keys = Object.keys(record)

	if (!REQUIRED_QMT_KEYS.every((key) => keys.includes(key))) return false

	const accountId = String(record.account_id ?? "").trim()
	if (accountId === "" || accountId === "0") return false

	if (String(record.qmt_path ?? "").trim() === "") return false
	if (String(record.qmt_port ?? "").trim() === "") return false

	return true
}

export interface TradingPreconditionInput {
	/** 当前库的策略列表（select：select_stock 列表；pos：fusion / pos_mgmt 列表）。 */
	strategies: unknown
	/** electron-store `real_market_config`（renderer 与 main 同源读取）。 */
	realMarketConfig: unknown
	/** 历史数据是否自动更新中（仅 requireDataUpdating 时参与判定）。 */
	isUpdating?: boolean
	/** 实时数据是否自动更新中（仅 requireDataUpdating 时参与判定）。 */
	isMinDataUpdating?: boolean
	/**
	 * 是否要求「历史数据 + 实时数据自动更新」均已开启。
	 * renderer 交互 enable 走 UX gate（=!ignoreUpdateCheck）；main cron / setAutoTrading 自校验传 false
	 * （主进程的数据调度是其自身职责，rocket 前置不依赖渲染层的更新开关）。
	 */
	requireDataUpdating: boolean
}

export interface TradingPreconditionResult {
	ok: boolean
	code: TradingGuardCode
}

/**
 * 自动实盘前置条件校验。固定判定顺序：
 *   no_strategy → zero_weight → data_not_updating（可选）→ qmt_not_configured。
 */
export function validateTradingPreconditions(
	input: TradingPreconditionInput,
): TradingPreconditionResult {
	const {
		strategies,
		realMarketConfig,
		isUpdating,
		isMinDataUpdating,
		requireDataUpdating,
	} = input

	if (!Array.isArray(strategies) || strategies.length === 0) {
		return { ok: false, code: "no_strategy" }
	}
	if (!hasPositiveWeight(strategies)) {
		return { ok: false, code: "zero_weight" }
	}
	if (requireDataUpdating && (!isUpdating || !isMinDataUpdating)) {
		return { ok: false, code: "data_not_updating" }
	}
	if (!isQmtConfigured(realMarketConfig)) {
		return { ok: false, code: "qmt_not_configured" }
	}
	return { ok: true, code: "ok" }
}

/**
 * rStore（`real_market_25.json`）快照是否「可用于实盘」——main 启动前最后一道 fail-closed 自检。
 *
 * 这是 rStore **内部 shape + 正权重**自检，**不与 config.json 交叉映射装饰名**
 * （real_market_25 的 name 是 `#i.x`/`Xi-x`/`非策略选股` 装饰名，与 config.json 不直接相等，
 *  交叉校验脆弱易误杀）。它**只能**拦下「空 / 结构损坏 / 仅非策略选股或全 0 权重」的灾难态；
 * **不能**判定「结构正确但策略陈旧（stale）」——后者属旧 renderer/裸 IPC 绕过的残余风险，
 * 由后续 IPC 契约托管 + main 权威治理解决（不在此声称已校验 fresh 快照）。
 *
 * 判据（任一不满足 → false → fail-closed 不启动 rocket）：
 * - snapshot 为非数组对象、entries 非空；
 * - 每个 entry 为对象，`name` 为非空 string，`buy`/`sell` 为数组且 `length >= 2`（实际有槽位）；
 * - 至少一个 entry 的 `strategy_weight` 为 finite number 且 > 0（与 S1 zero_weight 同口径：
 *   过滤「仅非策略选股(weight 0) / 全 0 权重」——这些给 rocket 不会下任何真实单）。
 */
export function isRealMarketDataUsable(snapshot: unknown): boolean {
	if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
		return false
	}
	const entries = Object.values(snapshot as Record<string, unknown>)
	if (entries.length === 0) return false

	let hasPositiveWeightStrategy = false
	for (const entry of entries) {
		if (!entry || typeof entry !== "object") return false
		const e = entry as {
			name?: unknown
			buy?: unknown
			sell?: unknown
			strategy_weight?: unknown
		}
		if (typeof e.name !== "string" || e.name === "") return false
		if (!Array.isArray(e.buy) || e.buy.length < 2) return false
		if (!Array.isArray(e.sell) || e.sell.length < 2) return false
		if (typeof e.strategy_weight === "number" && Number.isFinite(e.strategy_weight) && e.strategy_weight > 0) {
			hasPositiveWeightStrategy = true
		}
	}
	return hasPositiveWeightStrategy
}
