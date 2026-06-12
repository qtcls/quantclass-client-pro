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
 * `real_market_config`（config.json）单一权威写入器（main 侧）。
 *
 * S2a：把驱动实盘下单的 `real_market_config` 收敛为 config.json 唯一权威源。
 * 所有写入经此 read-modify-write merge，**绝不整对象 clobber 兄弟字段**、**绝不物化默认值**
 * （保 S1 trading-guard 的 key-presence fail-closed 语义）。
 *
 * 同步性：electron-store v10（conf）的 `.get`/`.set` 均为同步（每次读盘 / 原子写盘）。
 * `mergeRealMarketConfig` 全程同步无 await → 对 main 事件循环原子，杜绝并发 partial save 的
 * lost-update；且 `.set` 写前重读整文件，跨顶层 key 不互相 clobber。
 */

import type { RealMarketConfigWire } from "@/shared/lib/real-market-config-codec.js"
import Store from "electron-store"

const REAL_MARKET_CONFIG_KEY = "real_market_config"

// -- 与既有读者（process.ts / scheduler.ts / fuel-probe.ts 等）共享同一 config.json
// -- （electron-store 默认实例；conf 每次 .get 读盘，跨实例一致）
const store = new Store()

/**
 * 读取 config.json 的 `real_market_config` 原始值（**不叠加任何默认**）。
 * 用作 merge 基底与"等价 guard 读"；绝不可用 `store/index.ts` 的 async getValue
 * （其 `|| 默认` 会物化默认 + 引入 await，破坏 fail-closed 与同步原子性）。
 */
export function getRealMarketConfigRaw(): Partial<RealMarketConfigWire> {
	const value = store.get(REAL_MARKET_CONFIG_KEY)
	if (!value || typeof value !== "object") return {}
	return value as Partial<RealMarketConfigWire>
}

/**
 * read-modify-write 合并写入（**同步**）。
 * - 以 raw（无默认）为基底，仅浅合并显式传入的 wire key；
 * - 兄弟字段（尤其 use_fuzzy/use_open_sell/account_id）原样保留；
 * - 缺失的必需 key 不被默认物化（保 S1 key-presence 阻止）。
 * @returns merge 后的 raw wire（供 renderer decodeToUi 同步 atom）。
 */
export function mergeRealMarketConfig(
	wirePatch: Partial<RealMarketConfigWire>,
): Partial<RealMarketConfigWire> {
	const current = getRealMarketConfigRaw()
	const merged: Partial<RealMarketConfigWire> = { ...current, ...wirePatch }
	store.set(REAL_MARKET_CONFIG_KEY, merged)
	return merged
}
