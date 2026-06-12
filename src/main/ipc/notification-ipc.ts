/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import {
	countNotifications,
	getUnreadCount,
	listNotifications,
	markAllRead,
	markNotificationRead,
} from "@/main/server/controllers/notify.js"
import DBManager from "@/main/lib/db-manager.js"
import logger from "@/main/utils/wiston.js"
import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import type { NotificationListParams } from "@/shared/types/client-notification.js"
import { ipcMain } from "electron"

function listHandler(): void {
	ipcMain.handle(
		IPC_CHANNELS.NOTIFICATION_LIST,
		async (_event, params: NotificationListParams = {}) => {
			const db = await DBManager.getInstance().getConnection()
			if (!db) {
				logger.warn("[notification-ipc] DB 未就绪，list 返回空")
				return { items: [], total: 0 }
			}
			try {
				const total = countNotifications(db, params)
				const items = listNotifications(db, params)
				return { items, total }
			} catch (error) {
				logger.error(`[notification-ipc] list 异常: ${error}`)
				return { items: [], total: 0 }
			}
		},
	)
}

function unreadCountHandler(): void {
	ipcMain.handle(IPC_CHANNELS.NOTIFICATION_UNREAD_COUNT, async () => {
		const db = await DBManager.getInstance().getConnection()
		if (!db) return 0
		try {
			return getUnreadCount(db)
		} catch (error) {
			logger.error(`[notification-ipc] unread-count 异常: ${error}`)
			return 0
		}
	})
}

function markReadHandler(): void {
	ipcMain.handle(IPC_CHANNELS.NOTIFICATION_MARK_READ, async (_event, id: number) => {
		if (typeof id !== "number" || !Number.isFinite(id)) return false
		const db = await DBManager.getInstance().getConnection()
		if (!db) return false
		try {
			return markNotificationRead(db, id)
		} catch (error) {
			logger.error(`[notification-ipc] mark-read 异常: ${error}`)
			return false
		}
	})
}

function markAllReadHandler(): void {
	ipcMain.handle(IPC_CHANNELS.NOTIFICATION_MARK_ALL_READ, async () => {
		const db = await DBManager.getInstance().getConnection()
		if (!db) return 0
		try {
			return markAllRead(db)
		} catch (error) {
			logger.error(`[notification-ipc] mark-all-read 异常: ${error}`)
			return 0
		}
	})
}

export const regNotificationIPC = () => {
	listHandler()
	unreadCountHandler()
	markReadHandler()
	markAllReadHandler()
	console.log("[reg] notification-ipc")
}
