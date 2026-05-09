/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import windowManager from "@/main/lib/WindowManager.js"
import DBManager from "@/main/lib/db-manager.js"
import store from "@/main/store/index.js"
import { sendWeComRobotTextForNotification } from "@/main/utils/wecom-robot.js"
import logger from "@/main/utils/wiston.js"
import {
	NOTIFICATION_LEVELS,
	NOTIFICATION_REPORT_CODE,
	NOTIFICATION_SOURCES,
	type NotificationLevel,
	type NotificationSource,
} from "@/shared/constants.js"
import type {
	ClientNotification,
	NotificationListParams,
} from "@/shared/types/client-notification.js"
import type SqliteConstructor from "better-sqlite3"
import type { Context } from "hono"
import type { Env } from "../types/index.js"

type SqliteDb = InstanceType<typeof SqliteConstructor>

/** 按连接实例记录是否已跑过 client_notifications DDL */
const notificationDdlEnsured = new WeakMap<SqliteDb, true>()

interface NotifyBody {
	source: NotificationSource
	level: NotificationLevel
	message: string
	title?: string
	event?: string
	payload?: Record<string, unknown>
	silent?: boolean
}

// -- 建 client_notifications 表
function ensureTable(db: SqliteDb) {
	if (notificationDdlEnsured.has(db)) return
	db.exec(`
		CREATE TABLE IF NOT EXISTS client_notifications (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			source TEXT NOT NULL,
			level TEXT NOT NULL,
			title TEXT,
			message TEXT NOT NULL,
			event TEXT,
			payload TEXT,
			created_at TEXT NOT NULL,
			read_at TEXT
		)
	`)
	db.exec(`
		CREATE INDEX IF NOT EXISTS idx_client_notifications_created_at
		ON client_notifications (created_at DESC)
	`)
	db.exec(`
		CREATE INDEX IF NOT EXISTS idx_client_notifications_read_at
		ON client_notifications (read_at)
	`)
	notificationDdlEnsured.set(db, true)
}

function isValidSource(v: unknown): v is NotificationSource {
	return (
		typeof v === "string" &&
		(NOTIFICATION_SOURCES as readonly string[]).includes(v)
	)
}

function isValidLevel(v: unknown): v is NotificationLevel {
	return (
		typeof v === "string" &&
		(NOTIFICATION_LEVELS as readonly string[]).includes(v)
	)
}

async function getNotifyDb(): Promise<SqliteDb | null> {
	const allDataPath = await store.getSetting("all_data_path", "")
	if (!allDataPath) return null
	return DBManager.getInstance().getConnection()
}

function selectNotificationById(
	db: SqliteDb,
	id: number,
): ClientNotification | undefined {
	return db
		.prepare(
			`SELECT id, source, level, title, message, event, payload, created_at, read_at
			 FROM client_notifications WHERE id = ?`,
		)
		.get(id) as ClientNotification | undefined
}

// -- POST /notify
export async function createNotification(c: Context<Env>) {
	let body: Partial<NotifyBody>
	try {
		body = (await c.req.json()) as Partial<NotifyBody>
	} catch {
		return c.json({ message: "请求体不是有效的 JSON" }, 400)
	}

	if (!isValidSource(body.source)) {
		return c.json(
			{
				message: `source 非法，应为 ${NOTIFICATION_SOURCES.join("/")} 之一`,
			},
			400,
		)
	}
	if (!isValidLevel(body.level)) {
		return c.json(
			{
				message: `level 非法，应为 ${NOTIFICATION_LEVELS.join("/")} 之一`,
			},
			400,
		)
	}
	if (typeof body.message !== "string" || !body.message.trim()) {
		return c.json({ message: "message 不能为空" }, 400)
	}

	const db = await getNotifyDb()
	if (!db) {
		logger.warn("[notify] DB 未就绪，无法写入通知")
		return c.json({ message: "客户端 DB 未就绪" }, 503)
	}

	try {
		ensureTable(db)

		const createdAt = new Date().toISOString()
		const payloadJson =
			body.payload === undefined ? null : JSON.stringify(body.payload)

		const insert = db.prepare(
			`INSERT INTO client_notifications (
				source, level, title, message, event, payload, created_at, read_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
		)
		const result = insert.run(
			body.source,
			body.level,
			body.title ?? null,
			body.message,
			body.event ?? null,
			payloadJson,
			createdAt,
		)
		const id = Number(result.lastInsertRowid)
		if (!Number.isFinite(id) || id <= 0) {
			logger.error("[notify] INSERT 未得到有效 id")
			return c.json({ message: "写入通知失败" }, 500)
		}

		const row = selectNotificationById(db, id)
		if (!row) {
			logger.error("[notify] INSERT 后读取新行失败")
			return c.json({ message: "写入通知失败" }, 500)
		}

		const mainWindow = windowManager.getWindow()

		// -- 始终推送一条 notification:new，前端用来更新未读数 / 列表
		mainWindow?.webContents.send("notification:new", row)

		if (body.silent !== true) {
			mainWindow?.webContents.send("report-msg", {
				code: NOTIFICATION_REPORT_CODE,
				msgType: body.level,
				message: body.message,
				source: body.source,
				title: body.title,
			})
			void sendWeComRobotTextForNotification(row)
		}

		logger.info(
			`[notify] 收到来自 ${body.source} 的 ${body.level} 通知 #${row.id}`,
		)

		return c.json({ data: { id: row.id } }, 201)
	} catch (error) {
		logger.error(`[notify] 写入通知异常: ${error}`)
		return c.json({ message: "写入通知失败" }, 500)
	}
}

export function listNotifications(
	db: SqliteDb,
	params: NotificationListParams = {},
) {
	ensureTable(db)
	const { limit = 50, offset = 0, source, level, dateFrom, dateTo } = params

	const readFilter: "all" | "unread" | "read" = params.readFilter ?? "all"

	const conditions: string[] = []
	const values: unknown[] = []
	if (readFilter === "unread") conditions.push("read_at IS NULL")
	if (readFilter === "read") conditions.push("read_at IS NOT NULL")
	if (source) {
		conditions.push("source = ?")
		values.push(source)
	}
	if (level) {
		conditions.push("level = ?")
		values.push(level)
	}
	if (dateFrom?.trim()) {
		conditions.push("date(created_at) >= date(?)")
		values.push(dateFrom.trim())
	}
	if (dateTo?.trim()) {
		conditions.push("date(created_at) <= date(?)")
		values.push(dateTo.trim())
	}
	const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

	const sql = `SELECT id, source, level, title, message, event, payload, created_at, read_at
		FROM client_notifications ${where}
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?`
	values.push(limit, offset)

	return db.prepare(sql).all(...values) as ClientNotification[]
}

export function getUnreadCount(db: SqliteDb): number {
	ensureTable(db)
	const row = db
		.prepare(
			"SELECT count(*) AS count FROM client_notifications WHERE read_at IS NULL",
		)
		.get() as { count: number } | undefined
	return row?.count ?? 0
}

export function markNotificationRead(db: SqliteDb, id: number): boolean {
	ensureTable(db)
	const readAt = new Date().toISOString()
	const result = db
		.prepare(
			"UPDATE client_notifications SET read_at = ? WHERE id = ? AND read_at IS NULL",
		)
		.run(readAt, id)
	return (result.changes ?? 0) > 0
}

export function markAllRead(db: SqliteDb): number {
	ensureTable(db)
	const readAt = new Date().toISOString()
	const result = db
		.prepare(
			"UPDATE client_notifications SET read_at = ? WHERE read_at IS NULL",
		)
		.run(readAt)
	return result.changes ?? 0
}
