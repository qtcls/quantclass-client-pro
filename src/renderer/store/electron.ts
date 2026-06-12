/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { IDataListType } from "@/renderer/schemas/data-schema"
import type { SettingsType } from "@/renderer/types"
import type { BlacklistItem } from "@/renderer/types/trading"
import { atomWithElectronStore } from "@/renderer/utils/store"

/**
 * 买入黑名单
 */
export const buyBlacklistAtom = atomWithElectronStore<BlacklistItem[]>(
	"buy-blacklist",
	[],
)

/**
 * 设置
 */
export const settingsAtom = atomWithElectronStore<SettingsType>("settings", {
	all_data_path: "",
	strategy_result_path: "",
	is_auto_launch_update: false,
	is_auto_launch_min_data: false,
	is_auto_launch_real_trading: false,
	data_white_list: [],
	hid: "",
	api_key: "",
	libraryType: "select",
	performance_mode: "EQUAL",
	user_choice: false,
})

export const dataSubscribedAtom = atomWithElectronStore<IDataListType[]>(
	"data_map",
	[],
)

/**
 * 定时任务
 */
export const scheduleTimesAtom = atomWithElectronStore<{
	dataModule: string[]
	selectModule: string[]
}>("schedule", {
	dataModule: [],
	selectModule: [],
})

/**
 * 自动初始化
 * 配置在列表中后，会自动初始化
 *
 * 注：实盘配置 `real_market_config` 的 @deprecated `realMarketConfigAtom` 已于 S2a 移除
 * —— config.json 为唯一权威源，UI 投影为 `storage.ts` 的 `realMarketConfigSchemaAtom`
 * （由 boot 水合 + saveRealMarketConfig ack 派生）。
 */
export const autoInitAtoms = [
	settingsAtom,
	scheduleTimesAtom,
	buyBlacklistAtom,
	dataSubscribedAtom,
]
