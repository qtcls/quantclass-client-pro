/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { runFullStartupCheck } from "@/main/lib/startup-check/run-full-check.js"
import { publishClientNotification } from "@/main/server/controllers/notify.js"
import logger from "@/main/utils/wiston.js"
import type { NotificationLevel } from "@/shared/constants.js"
import type {
	StartupCheckScheduleConfig,
	StartupCheckStepResult,
} from "@/shared/types/startup-check-schedule.js"
import Store from "electron-store"
import schedule from "node-schedule"

const scheduleStore = new Store<{
	startupCheckDailyEnabled?: boolean
	startupCheckDailyTimes?: string[]
	startupCheckDailyTime?: string
	startupCheckPushResultEnabled?: boolean
}>()

const DAILY_ENABLED_KEY = "startupCheckDailyEnabled" as const
const DAILY_TIMES_KEY = "startupCheckDailyTimes" as const
const LEGACY_DAILY_TIME_KEY = "startupCheckDailyTime" as const
const PUSH_RESULT_KEY = "startupCheckPushResultEnabled" as const

export const DEFAULT_STARTUP_CHECK_DAILY_TIME = "09:15"
export const DEFAULT_STARTUP_CHECK_DAILY_TIMES = [DEFAULT_STARTUP_CHECK_DAILY_TIME]

let scheduledJobs: schedule.Job[] = []
let checkRunning = false

function parseTimeHHmm(s: string): { hour: number; minute: number } | null {
	const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
	if (!m) return null
	const hour = Number(m[1])
	const minute = Number(m[2])
	if (
		!Number.isInteger(hour) ||
		!Number.isInteger(minute) ||
		hour < 0 ||
		hour > 23 ||
		minute < 0 ||
		minute > 59
	) {
		return null
	}
	return { hour, minute }
}

function formatTimeHHmm(parsed: { hour: number; minute: number }): string {
	return `${String(parsed.hour).padStart(2, "0")}:${String(parsed.minute).padStart(2, "0")}`
}

function normalizeDailyTimes(times: string[]): string[] {
	const normalized: string[] = []
	for (const time of times) {
		const parsed = parseTimeHHmm(time)
		if (!parsed) continue
		const formatted = formatTimeHHmm(parsed)
		if (!normalized.includes(formatted)) normalized.push(formatted)
	}
	return normalized.sort()
}

function resolveOverallLevel(
	steps: StartupCheckStepResult[],
): NotificationLevel {
	if (steps.some((s) => !s.ok)) return "error"
	if (steps.some((s) => s.warning)) return "warning"
	return "success"
}

function formatStartupCheckMessage(steps: StartupCheckStepResult[]): string {
	return steps
		.map((step) => {
			const icon = step.warning ? "⚠" : step.ok ? "✓" : "✗"
			const detail = step.detail ? `：${step.detail}` : ""
			return `${icon} ${step.title}${detail}`
		})
		.join("\n")
}

export function getStartupCheckPushResultEnabled(): boolean {
	return scheduleStore.get(PUSH_RESULT_KEY) ?? true
}

export function setStartupCheckPushResultEnabled(enabled: boolean): {
	ok: true
} {
	scheduleStore.set(PUSH_RESULT_KEY, enabled)
	return { ok: true }
}

export function getStartupCheckDailyEnabled(): boolean {
	return scheduleStore.get(DAILY_ENABLED_KEY) ?? true
}

export function setStartupCheckDailyEnabled(enabled: boolean): { ok: true } {
	scheduleStore.set(DAILY_ENABLED_KEY, enabled)
	refreshStartupCheckSchedule()
	return { ok: true }
}

export function getStartupCheckDailyTimes(): string[] {
	const stored = scheduleStore.get(DAILY_TIMES_KEY) as string[] | undefined
	if (stored?.length) {
		const normalized = normalizeDailyTimes(stored)
		if (normalized.length > 0) return normalized
	}

	const legacy = scheduleStore.get(LEGACY_DAILY_TIME_KEY) as string | undefined
	if (legacy) {
		const parsed = parseTimeHHmm(legacy)
		if (parsed) return [formatTimeHHmm(parsed)]
	}

	return [...DEFAULT_STARTUP_CHECK_DAILY_TIMES]
}

export function setStartupCheckDailyTimes(times: string[]): {
	ok: boolean
	error?: string
} {
	if (!Array.isArray(times) || times.length === 0) {
		return { ok: false, error: "至少保留一个执行时间" }
	}

	const normalized: string[] = []
	for (const time of times) {
		const parsed = parseTimeHHmm(time)
		if (!parsed) {
			return { ok: false, error: `时间格式须为 HH:mm（24 小时制）：${time}` }
		}
		const formatted = formatTimeHHmm(parsed)
		if (!normalized.includes(formatted)) normalized.push(formatted)
	}

	normalized.sort()
	scheduleStore.set(DAILY_TIMES_KEY, normalized)
	scheduleStore.delete(LEGACY_DAILY_TIME_KEY)
	refreshStartupCheckSchedule()
	return { ok: true }
}

export function getStartupCheckScheduleConfig(): StartupCheckScheduleConfig {
	return {
		dailyEnabled: getStartupCheckDailyEnabled(),
		dailyTimes: getStartupCheckDailyTimes(),
		pushResultEnabled: getStartupCheckPushResultEnabled(),
	}
}

export async function publishStartupCheckReport(
	steps: StartupCheckStepResult[],
): Promise<void> {
	if (!getStartupCheckPushResultEnabled()) return

	const level = resolveOverallLevel(steps)
	const message = formatStartupCheckMessage(steps)
	const title =
		level === "success"
			? "客户端自检全部通过"
			: level === "warning"
				? "客户端自检存在需注意项"
				: "客户端自检存在未通过项"

	await publishClientNotification({
		source: "client",
		level,
		title,
		message,
		event: "startup_check_report",
	})
}

async function runScheduledStartupCheck(): Promise<void> {
	if (checkRunning) {
		logger.info("[startup-check] 上一轮自检仍在进行，跳过本次定时任务")
		return
	}

	checkRunning = true
	try {
		logger.info("[startup-check] 开始执行定时自检")
		const steps = await runFullStartupCheck()
		await publishStartupCheckReport(steps)
	} catch (e) {
		logger.error(`[startup-check] 定时自检异常: ${e}`)
	} finally {
		checkRunning = false
	}
}

export function refreshStartupCheckSchedule(): void {
	for (const job of scheduledJobs) {
		job.cancel()
	}
	scheduledJobs = []

	if (!getStartupCheckDailyEnabled()) {
		logger.info("[startup-check] 每日定时自检已关闭，未设置计划")
		return
	}

	const times = getStartupCheckDailyTimes()
	const scheduledLabels: string[] = []

	for (const timeStr of times) {
		const parsed = parseTimeHHmm(timeStr)
		if (!parsed) {
			logger.warn(`[startup-check] 无效的计划时间，跳过: ${timeStr}`)
			continue
		}

		const rule = new schedule.RecurrenceRule()
		rule.hour = parsed.hour
		rule.minute = parsed.minute
		rule.second = 0

		const job = schedule.scheduleJob(rule, () => {
			void runScheduledStartupCheck()
		})
		if (job) {
			scheduledJobs.push(job)
			scheduledLabels.push(formatTimeHHmm(parsed))
		}
	}

	if (scheduledLabels.length === 0) {
		logger.warn("[startup-check] 无有效计划时间，跳过调度")
		return
	}

	logger.info(
		`[startup-check] 已设置每日 ${scheduledLabels.join("、")} 自动自检（共 ${scheduledLabels.length} 次）`,
	)
}
