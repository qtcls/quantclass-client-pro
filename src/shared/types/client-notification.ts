/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { NotificationLevel, NotificationSource } from "../constants.js"

export interface ClientNotification {
	id: number
	source: string
	level: string
	title: string | null
	message: string
	event: string | null
	payload: string | null
	silent: number
	created_at: string
	read_at: string | null
}

export interface NotificationListParams {
	limit?: number
	offset?: number
	readFilter?: "all" | "unread" | "read"
	source?: NotificationSource
	level?: NotificationLevel
	dateFrom?: string
	dateTo?: string
}

export interface NotificationListResult {
	items: ClientNotification[]
	total: number
}
