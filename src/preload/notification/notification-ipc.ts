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
	getUnreadCount,
	listNotifications,
	markAllRead,
	markNotificationRead,
} from "@/main/server/controllers/notify.js"
import DBManager from "@/main/lib/db-manager.js"
import logger from "@/main/utils/wiston.js"
import type { NotificationListParams } from "@/shared/types/client-notification.js"
import { ipcMain } from "electron"

function listHandler(): void {
	ipcMain.handle(
		"notification:list",
		async (_event, params: NotificationListParams = {}) => {
			const db = await DBManager.getInstance().getConnection()
			if (!db) {
				logger.warn("[notification-ipc] DB 未就绪，list 返回空")
				return []
			}
			try {
				return listNotifications(db, params)
			} catch (error) {
				logger.error(`[notification-ipc] list 异常: ${error}`)
				return []
			}
		},
	)
}

function unreadCountHandler(): void {
	ipcMain.handle("notification:unread-count", async () => {
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
	ipcMain.handle("notification:mark-read", async (_event, id: number) => {
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
	ipcMain.handle("notification:mark-all-read", async () => {
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
