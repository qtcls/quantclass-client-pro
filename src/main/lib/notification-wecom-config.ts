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
import type { NotificationWeComConfig } from "@/shared/types/notification-wecom-config.js"
import dayjs from "dayjs"

export type { NotificationWeComConfig }

const CONFIG_KEY = "notificationWeComConfig"

export const DEFAULT_NOTIFICATION_WECOM_CONFIG: NotificationWeComConfig = {
	dndEnabled: false,
	dndStart: "22:00",
	dndEnd: "08:00",
	dataKernelEnabled: true,
	nonDataKernelEnabled: true,
	dailyLimit: 20,
}

// fuel 数据内核，其余 非数据内核
export const DATA_KERNEL_SOURCES = ["fuel"] as const
export const NON_DATA_KERNEL_SOURCES = ["rocket", "fusion", "client"] as const

export async function getNotificationWeComConfig(): Promise<NotificationWeComConfig> {
	const stored = (await store.getValue(
		CONFIG_KEY,
		{},
	)) as Partial<NotificationWeComConfig>
	return { ...DEFAULT_NOTIFICATION_WECOM_CONFIG, ...stored }
}

export async function setNotificationWeComConfig(
	patch: Partial<NotificationWeComConfig>,
): Promise<void> {
	const current = await getNotificationWeComConfig()
	const next: NotificationWeComConfig = { ...current, ...patch }
	if (
		typeof next.dailyLimit !== "number" ||
		!Number.isFinite(next.dailyLimit) ||
		next.dailyLimit < 1
	) {
		next.dailyLimit = DEFAULT_NOTIFICATION_WECOM_CONFIG.dailyLimit
	}
	next.dailyLimit = Math.floor(next.dailyLimit)
	store.setValue(CONFIG_KEY, next)
}

// 判断当前时间是否在免打扰区间内
function isDndActive(start: string, end: string): boolean {
	const now = dayjs()
	const toMin = (hhmm: string) => {
		const [h, m] = hhmm.split(":").map(Number)
		return h * 60 + (m || 0)
	}
	const startMin = toMin(start)
	const endMin = toMin(end)
	const nowMin = now.hour() * 60 + now.minute()

	if (startMin === endMin) return false
	if (startMin < endMin) {
		// 同日区间，如 09:00–18:00
		return nowMin >= startMin && nowMin < endMin
	}
	// 跨午夜区间，如 22:00–08:00
	return nowMin >= startMin || nowMin < endMin
}

// 判断某条通知是否允许推送企微（免打扰 + source 过滤）
export async function isWeComPushAllowed(source: string): Promise<boolean> {
	const cfg = await getNotificationWeComConfig()

	if (cfg.dndEnabled && isDndActive(cfg.dndStart, cfg.dndEnd)) {
		return false
	}

	if (
		(DATA_KERNEL_SOURCES as readonly string[]).includes(source) &&
		!cfg.dataKernelEnabled
	) {
		return false
	}

	if (
		(NON_DATA_KERNEL_SOURCES as readonly string[]).includes(source) &&
		!cfg.nonDataKernelEnabled
	) {
		return false
	}

	return true
}
