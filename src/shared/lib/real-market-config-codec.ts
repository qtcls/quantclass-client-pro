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
 * 实盘配置 `real_market_config` 编解码（纯函数）。
 *
 * ⚠️ 本文件必须保持纯净：禁止 import electron / window / fs / react 等任何宿主依赖
 * （仅依赖跨端可用的 dayjs）。它被 renderer（decode 展示 / 编辑）与 main（encode 落盘）
 * 双端 import，作为 UI 形态 ↔ config.json wire 形态之间**唯一**的编解码边界。
 *
 * 编码契约（wire = config.json，内核/main 真正消费的形态，**冻结**）：
 * - filter_kcb/filter_cyb/filter_bj：wire 为 **boolean**；UI 为 "0"|"1" 字符串。
 * - use_fuzzy/use_open_sell：wire 与 UI 均为 **"0"|"1" 字符串**，**绝不 bool 化**
 *   （main process.ts / fuel-probe 按字符串传 env；strategy-status `=== "1"`）。
 * - date_start：wire 为 **"YYYY-MM-DD"** 字符串；UI 为 Date。
 * - 其余字段（qmt_path/account_id/qmt_port/message_robot_url/performance_mode/
 *   reverse_repo_keep）原样透传。
 */

import dayjs from "dayjs"

/** config.json 内 `real_market_config` 的 wire 形态（内核/main 读取的真相）。 */
export interface RealMarketConfigWire {
	qmt_path: string
	account_id: string
	qmt_port: string
	message_robot_url: string
	/** "YYYY-MM-DD" */
	date_start: string
	performance_mode: "EQUAL" | "PERFORMANCE" | "ECONOMY"
	/** 过滤板块：wire 恒 boolean（绝不字符串化）。 */
	filter_kcb: boolean
	filter_cyb: boolean
	filter_bj: boolean
	/** "0" | "1"，恒字符串（绝不 bool 化）。 */
	use_fuzzy: string
	use_open_sell: string
	reverse_repo_keep: number | string
}

/** 渲染层（表单 / schema atom）使用的 UI 形态。结构与 `z.infer<RealMarketConfigSchema>` 一致。 */
export interface RealMarketConfigUi {
	qmt_path: string
	account_id: string
	qmt_port: string
	message_robot_url?: string
	date_start?: Date
	performance_mode: "EQUAL" | "PERFORMANCE" | "ECONOMY"
	filter_kcb: "0" | "1"
	filter_cyb: "0" | "1"
	filter_bj: "0" | "1"
	use_fuzzy: "0" | "1"
	use_open_sell: "0" | "1"
	reverse_repo_keep: number | string
}

/**
 * UI 形态的默认值（仅供 decode 在 wire 缺字段时补齐展示用，**绝不回写 config.json**）。
 * 与历史 atom 默认保持一致（filter 默认过滤、use_fuzzy "1"、use_open_sell "0"）。
 */
export const REAL_MARKET_CONFIG_UI_DEFAULTS: Omit<
	RealMarketConfigUi,
	"date_start"
> = {
	qmt_path: "",
	account_id: "",
	qmt_port: "58610",
	message_robot_url: "",
	performance_mode: "EQUAL",
	filter_kcb: "1",
	filter_cyb: "1",
	filter_bj: "1",
	use_fuzzy: "1",
	use_open_sell: "0",
	reverse_repo_keep: 1000,
}

/** date_start 缺失时的展示默认（3 年前），与历史 atom 行为一致。 */
function defaultDateStart(): Date {
	return new Date(new Date().setFullYear(new Date().getFullYear() - 3))
}

/** UI 的 "0"/"1" → wire boolean。容错已是 boolean 的输入。 */
function filterToWire(v: "0" | "1" | boolean): boolean {
	return v === true || v === "1"
}

/** wire boolean（或历史可能的字符串）→ UI "0"/"1"。 */
function filterToUi(v: unknown): "0" | "1" {
	return v === true || v === "1" ? "1" : "0"
}

/**
 * UI 形态 → wire 形态（**只变换显式传入的 key**；`undefined` 一律忽略，不清字段）。
 * 用于落盘前的单字段 / 整表单 partial 编码；配合 main 的 read-modify-write merge。
 */
export function encodeToWire(
	ui: Partial<RealMarketConfigUi>,
): Partial<RealMarketConfigWire> {
	const wire: Partial<RealMarketConfigWire> = {}

	if (ui.qmt_path !== undefined) wire.qmt_path = ui.qmt_path
	if (ui.account_id !== undefined) wire.account_id = ui.account_id
	if (ui.qmt_port !== undefined) wire.qmt_port = ui.qmt_port
	if (ui.message_robot_url !== undefined)
		wire.message_robot_url = ui.message_robot_url
	if (ui.performance_mode !== undefined)
		wire.performance_mode = ui.performance_mode

	// -- 板块过滤：UI "0"/"1" → wire boolean
	if (ui.filter_kcb !== undefined) wire.filter_kcb = filterToWire(ui.filter_kcb)
	if (ui.filter_cyb !== undefined) wire.filter_cyb = filterToWire(ui.filter_cyb)
	if (ui.filter_bj !== undefined) wire.filter_bj = filterToWire(ui.filter_bj)

	// -- 模糊信号 / 开盘挂涨停：恒字符串 "0"/"1"（绝不 bool 化）。
	// -- 运行时白名单：仅接受 "0"/"1"，挡住 bool / 非法枚举经无类型 IPC 边界写脏 wire（fail-closed：非法值忽略，由 merge 保留原值）。
	if (ui.use_fuzzy === "0" || ui.use_fuzzy === "1") wire.use_fuzzy = ui.use_fuzzy
	if (ui.use_open_sell === "0" || ui.use_open_sell === "1")
		wire.use_open_sell = ui.use_open_sell

	// -- date_start：Date（或字符串）→ "YYYY-MM-DD"；非法日期则忽略（不写脏值）
	if (ui.date_start !== undefined) {
		const d = dayjs(ui.date_start)
		if (d.isValid()) wire.date_start = d.format("YYYY-MM-DD")
	}

	if (ui.reverse_repo_keep !== undefined)
		wire.reverse_repo_keep = ui.reverse_repo_keep

	return wire
}

/**
 * wire 形态 → 完整 UI 形态（缺字段补 UI 默认，仅供展示 / 表单初始化）。
 * 接受 raw（可能不完整）的 wire，自行补齐默认，故可直接喂给 schema atom。
 */
export function decodeToUi(
	wire: Partial<RealMarketConfigWire> | null | undefined,
): RealMarketConfigUi {
	const w = wire ?? {}

	return {
		qmt_path: w.qmt_path ?? REAL_MARKET_CONFIG_UI_DEFAULTS.qmt_path,
		account_id: w.account_id ?? REAL_MARKET_CONFIG_UI_DEFAULTS.account_id,
		qmt_port: w.qmt_port ?? REAL_MARKET_CONFIG_UI_DEFAULTS.qmt_port,
		message_robot_url:
			w.message_robot_url ?? REAL_MARKET_CONFIG_UI_DEFAULTS.message_robot_url,
		performance_mode:
			w.performance_mode ?? REAL_MARKET_CONFIG_UI_DEFAULTS.performance_mode,
		filter_kcb:
			w.filter_kcb === undefined
				? REAL_MARKET_CONFIG_UI_DEFAULTS.filter_kcb
				: filterToUi(w.filter_kcb),
		filter_cyb:
			w.filter_cyb === undefined
				? REAL_MARKET_CONFIG_UI_DEFAULTS.filter_cyb
				: filterToUi(w.filter_cyb),
		filter_bj:
			w.filter_bj === undefined
				? REAL_MARKET_CONFIG_UI_DEFAULTS.filter_bj
				: filterToUi(w.filter_bj),
		use_fuzzy: (w.use_fuzzy ??
			REAL_MARKET_CONFIG_UI_DEFAULTS.use_fuzzy) as "0" | "1",
		use_open_sell: (w.use_open_sell ??
			REAL_MARKET_CONFIG_UI_DEFAULTS.use_open_sell) as "0" | "1",
		date_start:
			w.date_start !== undefined ? new Date(w.date_start) : defaultDateStart(),
		reverse_repo_keep:
			w.reverse_repo_keep ?? REAL_MARKET_CONFIG_UI_DEFAULTS.reverse_repo_keep,
	}
}
