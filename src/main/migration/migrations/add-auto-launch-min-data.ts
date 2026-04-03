/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { Migration } from "../runner.js"

export const addAutoLaunchMinData: Migration = {
	id: "add_auto_launch_min_data",
	description:
		"老用户开启自动实盘时，补写 is_auto_launch_min_data = true",
	target: "main",
	up(store) {
		const hasMinData = store.has("settings.is_auto_launch_min_data")
		if (hasMinData) return

		const isAutoRealTrading = store.get(
			"settings.is_auto_launch_real_trading",
		)
		if (isAutoRealTrading === true) {
			store.set("settings.is_auto_launch_min_data", true)
		}
	},
}
