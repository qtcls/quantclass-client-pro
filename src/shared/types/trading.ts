/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { RealMarketConfigWire } from "@/shared/lib/real-market-config-codec.js"
import type { TradingGuardCode } from "@/shared/lib/trading-guard.js"

/**
 * `set-auto-trading` IPC ack 的失败原因码（诊断用，穷尽校验）。
 * = 前置守卫 code ∪ 主进程独有失败态。
 */
export type SetAutoTradingReason =
	| TradingGuardCode
	| "scheduler_failed"
	| "kill_failed"
	| "real_market_data_invalid"
	| "exception"

/**
 * `set-auto-trading` IPC 的权威 ack（renderer / preload / main 共用）。
 * 经 typing.d.ts 的 `typeof import preload` 推导流通到 `window.electronAPI.setAutoTrading`。
 */
export interface SetAutoTradingAck {
	/**
	 * 本次切换是否成功。
	 * - enable：主进程前置校验通过且定时任务已建立（schedulerRunning）。
	 * - disable：rocket 已被确认终止（rocketRunning === false）。
	 */
	ok: boolean
	/** 主进程权威的自动交易意图（= systemState.isSetAutoTrading）。 */
	isSetAutoTrading: boolean
	/** 每分钟 cron 任务是否已建立（systemState.job !== null）。 */
	schedulerRunning: boolean
	/**
	 * rocket 进程存活快照。
	 * 注意：**非 enable 成功条件** —— rocket 由 cron tick 在交易时段才启动，非交易时段合法 idle。
	 */
	rocketRunning: boolean
	/** 诊断用失败原因码（前置 guard code / "scheduler_failed" / "kill_failed" / "real_market_data_invalid" / "exception"）。 */
	reason?: SetAutoTradingReason
}

/**
 * `save-real-market-config` IPC ack 的失败原因码。
 * - trading_active：rocket 运行中，main 权威拒绝写入实盘配置（fail-closed，禁止运行中改钱路径配置）。
 * - exception：handler 内部异常（永不 reject，转为 ok:false）。
 */
export type SaveRealMarketConfigReason = "trading_active" | "exception"

/**
 * `save-real-market-config` IPC 的权威 ack（renderer / preload / main 共用）。
 * 经 typing.d.ts 的 `typeof import preload` 推导流通到 `window.electronAPI.saveRealMarketConfig`。
 */
export interface SaveRealMarketConfigAck {
	/** 是否成功落盘（rocket 运行中 / 异常时为 false，fail-closed）。 */
	ok: boolean
	/**
	 * 成功时返回 merge 后的 wire 配置（renderer 经 decodeToUi 同步 schema atom）。
	 * 为 raw merge 结果（不物化默认），可能不完整；decodeToUi 会补展示默认。
	 * 失败时不返回（renderer 不更新 atom、不弹成功 toast）。
	 */
	config?: Partial<RealMarketConfigWire>
	/** 诊断用失败原因码。 */
	reason?: SaveRealMarketConfigReason
	/** 异常信息（仅 reason === "exception" 时）。 */
	error?: string
}

/**
 * `save-real-market-data` IPC ack 的失败原因码。
 * - exception：handler 内部异常（读快照失败 / 写盘失败；永不 reject，转为 ok:false）。
 */
export type SaveRealMarketDataReason = "exception"

/**
 * `save-real-market-data` IPC 的权威 ack（renderer / preload / main 共用）。
 * 经 typing.d.ts 的 `typeof import preload` 推导流通到 `window.electronAPI.saveRealMarketData`。
 *
 * 写入语义：main 对 rStore（real_market_25.json）做**原子全量替换**（rStore.store = data），
 * 失败回滚到写前快照（fail-closed：绝不留半量/空文件）。enable 链据 ok 决定是否继续开启自动实盘。
 */
export interface SaveRealMarketDataAck {
	/** 是否成功原子落盘（读快照失败 / 写盘失败时为 false，已回滚或未写）。 */
	ok: boolean
	/** 诊断用失败原因码。 */
	reason?: SaveRealMarketDataReason
	/** 异常信息（仅 reason === "exception" 时）。 */
	error?: string
}
