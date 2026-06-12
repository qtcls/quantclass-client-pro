/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import { subscribeWithCleanup } from "@/shared/lib/ipc-subscription.js"
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
		ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION_LIST, params),

	getUnreadNotificationCount: (): Promise<number> =>
		ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION_UNREAD_COUNT),

	markNotificationRead: (id: number): Promise<boolean> =>
		ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION_MARK_READ, id),

	markAllNotificationsRead: (): Promise<number> =>
		ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION_MARK_ALL_READ),

	/** 订阅新通知推送（payload-only），返回只移除本次订阅的退订函数 */
	onNotification: (cb: (row: ClientNotification) => void): (() => void) =>
		subscribeWithCleanup(
			ipcRenderer,
			IPC_CHANNELS.NOTIFICATION_NEW,
			(_event, row: ClientNotification) => cb(row),
		),
}
