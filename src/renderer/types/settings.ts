/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

// 为什么这边不统一，只能说是历史原因了担待一下，后面新增的不分会统一
export type SettingsType = {
	all_data_path: string
	strategy_result_path: string
	is_auto_launch_update: boolean
	is_auto_launch_min_data: boolean
	is_auto_launch_real_trading: boolean
	data_white_list: string[]
	hid: string
	api_key: string
	libraryType: string
	performance_mode: string
	user_choice: boolean
	accelerated_data_source: boolean
}
