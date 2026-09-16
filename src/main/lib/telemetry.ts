/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { createHash } from "node:crypto"

import { getAppAndKernalVersions } from "@/main/core/lib.js"
import { userStore } from "@/main/lib/userStore.js"
import {
	type ClientTelemetryReportBody,
	postTelemetryReport,
} from "@/main/request/index.js"
import logger from "@/main/utils/wiston.js"
import { CLIENT_VERSION } from "@/main/vars.js"
import dayjs from "dayjs"
import Store from "electron-store"
import nodeMachineId from "node-machine-id"

const { machineIdSync } = nodeMachineId

const store = new Store()

const ONE_DAY_MS = 24 * 60 * 60 * 1000

let telemetryIntervalId: ReturnType<typeof setInterval> | null = null

function computeTelemetryVersionKey(input: {
	clientVersion: string
	fuelVersion: string
	fusionVersion: string
	rocketVersion: string
}): string {
	const canonical = JSON.stringify([
		input.clientVersion,
		input.fuelVersion,
		input.fusionVersion,
		input.rocketVersion,
	])
	return createHash("sha256").update(canonical, "utf8").digest("hex")
}

function generateNextReportTime(referenceTimestamp?: number): number {
	const reference = referenceTimestamp ?? Date.now()
	const targetDayStart = dayjs(reference).add(7, "day").startOf("day")

	const randomOffset = Math.floor(Math.random() * ONE_DAY_MS)
	return targetDayStart.valueOf() + randomOffset
}

async function buildTelemetryReportBody(): Promise<ClientTelemetryReportBody> {
	const clientVersion = CLIENT_VERSION
	const versions = await getAppAndKernalVersions()

	let machineId = ""
	try {
		machineId = machineIdSync()
	} catch (error) {
		logger.error(`[telemetry] 获取机器码失败: ${error}`)
	}

	const lastLoginTime = userStore.getLastLoginTime()
	const lastLoginStr = lastLoginTime
		? dayjs(lastLoginTime).format("YYYY-MM-DD HH:mm:ss")
		: ""

	let loginDuration = ""
	if (lastLoginTime) {
		const durationMinutes = dayjs().diff(dayjs(lastLoginTime), "minute")
		loginDuration = `${durationMinutes} minutes`
	}

	const data = {
		clientVersion,
		fuelVersion: versions.fuelVersion,
		fusionVersion: versions.fusionVersion,
		rocketVersion: versions.rocketVersion,
		lastLoginTime: lastLoginStr,
		loginDuration,
		machineId,
	}

	return {
		key: computeTelemetryVersionKey({
			clientVersion: data.clientVersion,
			fuelVersion: data.fuelVersion,
			fusionVersion: data.fusionVersion,
			rocketVersion: data.rocketVersion,
		}),
		data,
	}
}

async function reportTelemetry(): Promise<boolean> {
	try {
		const body = await buildTelemetryReportBody()

		logger.info(`[telemetry] 遥测数据: ${JSON.stringify(body)}`)

		await postTelemetryReport(body)

		logger.info("[telemetry] 遥测日志上报成功")
		return true
	} catch (error) {
		logger.error(`[telemetry] 遥测日志上报失败: ${error}`)
		return false
	}
}

export async function checkAndReportTelemetry(): Promise<void> {
	try {
		const now = Date.now()
		const nextReportTime = store.get(
			"app.telemetry_next_report_time",
			0,
		) as number

		if (!nextReportTime) {
			const firstReportTime = generateNextReportTime()
			store.set("app.telemetry_next_report_time", firstReportTime)
			logger.info(
				`[telemetry] 首次初始化，下次上报时间: ${dayjs(firstReportTime).format("YYYY-MM-DD HH:mm:ss")}`,
			)
			return
		}

		if (now < nextReportTime) {
			logger.info(
				`[telemetry] 未到上报时间，下次上报: ${dayjs(nextReportTime).format("YYYY-MM-DD HH:mm:ss")}`,
			)
			return
		}

		logger.info("[telemetry] 到达上报时间，开始执行遥测上报...")
		const success = await reportTelemetry()

		const nextTime = generateNextReportTime(nextReportTime)
		store.set("app.telemetry_next_report_time", nextTime)
		logger.info(
			`[telemetry] ${success ? "上报成功" : "上报失败"}，下次上报时间: ${dayjs(nextTime).format("YYYY-MM-DD HH:mm:ss")}`,
		)
	} catch (error) {
		logger.error(`[telemetry] 遥测检查异常: ${error}`)
	}
}

// 启动遥测定时检查 24小时一次
export function startTelemetryScheduler(): void {
	if (telemetryIntervalId !== null) {
		logger.info("[telemetry] 定时检查已在运行，跳过重复启动")
		return
	}
	checkAndReportTelemetry()
	telemetryIntervalId = setInterval(() => {
		checkAndReportTelemetry()
	}, ONE_DAY_MS)
	logger.info("[telemetry] 定时检查已启动，每 24 小时检查一次")
}

// 停止遥测定时检查
export function stopTelemetryScheduler(): void {
	if (telemetryIntervalId !== null) {
		clearInterval(telemetryIntervalId)
		telemetryIntervalId = null
		logger.info("[telemetry] 定时检查已停止")
	}
}
