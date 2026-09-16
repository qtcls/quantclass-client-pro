/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type {
	ClientNotification,
	NotificationListParams,
	NotificationListResult,
} from "@/shared/types/client-notification.js"
import { ipcRenderer } from "electron"

export const notificationIPC = {
	listNotifications: (
		params?: NotificationListParams,
	): Promise<NotificationListResult> =>
		ipcRenderer.invoke("notification:list", params),

	getUnreadNotificationCount: (): Promise<number> =>
		ipcRenderer.invoke("notification:unread-count"),

	markNotificationRead: (id: number): Promise<boolean> =>
		ipcRenderer.invoke("notification:mark-read", id),

	markAllNotificationsRead: (): Promise<number> =>
		ipcRenderer.invoke("notification:mark-all-read"),

	onNotification: (cb: (row: ClientNotification) => void): (() => void) => {
		const listener = (_event: unknown, row: ClientNotification) => cb(row)
		ipcRenderer.on("notification:new", listener)
		return () => {
			ipcRenderer.removeListener("notification:new", listener)
		}
	},

	removeNotificationListeners: () => {
		ipcRenderer.removeAllListeners("notification:new")
	},
}
