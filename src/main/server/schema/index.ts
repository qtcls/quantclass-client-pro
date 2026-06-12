/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const productStatus = sqliteTable("product_status", {
	name: text("name"),
	displayName: text("display_name"),
	full_data: text("full_data"),
	last_update_time: text("last_update_time"),
	next_update_time: text("next_update_time"),
	data_time: text("data_time"),
	data_content_time: text("data_content_time"),
	is_auto_update: integer("is_auto_update"),
	can_auto_update: integer("can_auto_update"),
	add_time: text("add_time"),
	is_listed: integer("is_listed"),
	full_data_download_url: text("full_data_download_url"),
	full_data_download_expires: text("full_data_download_expires"),
	ts: text("ts"),
})
