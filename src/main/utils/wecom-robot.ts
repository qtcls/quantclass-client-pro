/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import store from "@/main/store/index.js"
import logger from "@/main/utils/wiston.js"
import {
	NOTIFICATION_LEVELS,
	type NotificationLevel,
} from "@/shared/constants.js"
import type { ClientNotification } from "@/shared/types/client-notification.js"
import dayjs from "dayjs"

const WECOM_WEBHOOK_PREFIX =
	"https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key="

// 完整 URL 直用，否则视为 webhook key
function resolveWebhookUrl(api: string): string {
	const trimmed = api.trim()
	if (trimmed.startsWith("http")) return trimmed
	return `${WECOM_WEBHOOK_PREFIX}${trimmed}`
}

// robot_api 为 dict 时按 level 取 URL；为 string 时所有级别共用。
function resolveApiForLevel(
	robotApi: unknown,
	robotType: NotificationLevel,
): string | undefined {
	if (robotApi == null) return undefined
	if (typeof robotApi === "object" && !Array.isArray(robotApi)) {
		const v = (robotApi as Record<string, unknown>)[robotType]
		if (typeof v === "string" && v.trim()) return v.trim()
		return undefined
	}
	if (typeof robotApi === "string" && robotApi.trim()) return robotApi.trim()
	return undefined
}

// 配置项可能是 JSON 字符串（多机器人 dict）或单 URL/key
function parseMessageRobotRaw(raw: string): unknown {
	const t = raw.trim()
	if (!t) return undefined
	if (t.startsWith("{")) {
		try {
			return JSON.parse(t) as unknown
		} catch {
			return t
		}
	}
	return t
}

export function formatClientNotificationForWeCom(
	row: ClientNotification,
): string {
	const lines: string[] = [`[${row.source}] [${row.level}]`]
	if (row.title) lines.push(`标题：${row.title}`)
	lines.push(row.message)
	if (row.event) lines.push(`事件：${row.event}`)
	return lines.join("\n")
}

// 向实盘配置的企微机器人发送 text 消息
export async function sendWeComRobotText(
	content: string,
	robotType: NotificationLevel,
): Promise<void> {
	const realMarket = (await store.getValue("real_market_config", {})) as {
		message_robot_url?: string
	}
	const raw = String(realMarket?.message_robot_url ?? "").trim()
	if (!raw) return

	const robotApi = parseMessageRobotRaw(raw)
	const api = resolveApiForLevel(robotApi, robotType)
	if (!api) return

	const url = resolveWebhookUrl(api)
	const body = JSON.stringify({
		msgtype: "text",
		text: { content },
	})

	const ctrl = new AbortController()
	const timeoutMs = 10_000
	const timer = setTimeout(() => ctrl.abort(), timeoutMs)

	try {
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json;charset=utf-8" },
			body,
			signal: ctrl.signal,
		})
		if (!res.ok) {
			const txt = await res.text().catch(() => "")
			logger.warn(`[wecom-robot] HTTP ${res.status} ${txt}`)
		}
	} catch (e) {
		logger.warn(`[wecom-robot] 请求失败: ${e}`)
	} finally {
		clearTimeout(timer)
	}
}

const WECOM_EVENT_DAILY_LIMIT = 20
const WECOM_EVENT_COUNTS_KEY = "wecom_event_daily_counts"

interface WeComEventDailyCounts {
	date: string
	counts: Record<string, number>
}

async function checkWeComEventLimit(event: string): Promise<boolean> {
	const today = dayjs().format("YYYY-MM-DD")
	const stored = (await store.getValue(WECOM_EVENT_COUNTS_KEY, {
		date: today,
		counts: {},
	})) as WeComEventDailyCounts

	if (stored.date !== today) {
		store.setValue(WECOM_EVENT_COUNTS_KEY, {
			date: today,
			counts: { [event]: 1 },
		})
		return true
	}

	const current = stored.counts[event] ?? 0
	if (current >= WECOM_EVENT_DAILY_LIMIT) {
		return false
	}

	stored.counts[event] = current + 1
	store.setValue(WECOM_EVENT_COUNTS_KEY, stored)
	return true
}

export async function sendWeComRobotTextForNotification(
	row: ClientNotification,
): Promise<void> {
	const event = row.event ?? "_no_event_"

	const allowed = await checkWeComEventLimit(event)
	if (!allowed) {
		logger.info(
			`[wecom-robot] 事件 "${event}" 今日已达 ${WECOM_EVENT_DAILY_LIMIT} 条上限，跳过企微推送 (id=${row.id})`,
		)
		return
	}

	const level = (NOTIFICATION_LEVELS as readonly string[]).includes(row.level)
		? (row.level as NotificationLevel)
		: "info"
	const content = formatClientNotificationForWeCom(row)
	await sendWeComRobotText(content, level)
}
