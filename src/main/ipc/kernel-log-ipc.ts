/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import fs from "node:fs"
import path from "node:path"
import {
	type KernelWatcherRecord,
	registerWindowClosedSweep,
} from "@/main/ipc/kernel-log-window-sweep.js"
import store from "@/main/store/index.js"
import logger from "@/main/utils/wiston.js"
import { LIBRARY_TYPE } from "@/shared/constants.js"
import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import { getLocalCalendarYmd } from "@/shared/lib/trading-day.js"
import { BrowserWindow, ipcMain } from "electron"

const POLL_INTERVAL_MS = 1000

const activeWatchers = new Map<string, KernelWatcherRecord>()

const activeWatchersIndependent = new Map<string, KernelWatcherRecord>()

// -- 窗口关闭清扫覆盖的全部 watcher 家族（sweep 每窗口只注册一次，
// -- 首次注册捕获的就是这份列表——新增家族必须加在这里，不能只加调用点）
const WATCHER_FAMILIES: ReadonlyArray<Map<string, KernelWatcherRecord>> = [
	activeWatchers,
	activeWatchersIndependent,
]

function trackWatcher(
	family: Map<string, KernelWatcherRecord>,
	kernelType: KernelType,
	timer: KernelWatcherRecord["timer"],
	lastSize: number,
	senderWindow: Electron.BrowserWindow | null,
): void {
	family.set(kernelType, {
		timer,
		lastSize,
		ownerId: senderWindow ? senderWindow.webContents.id : -1,
	})
	if (senderWindow) {
		registerWindowClosedSweep(senderWindow, WATCHER_FAMILIES)
	}
}

const KERNEL_LOG_PATH_MAP: Record<string, string[]> = {
	fuel: ["code", "data", "log"],
	select: ["real_trading", "logs"],
	rocket: ["real_trading", "rocket", "data", "系统日志"],
}

type KernelType = "fuel" | "select" | "rocket"

async function getLogFileName(kernelType: KernelType): Promise<string> {
	if (kernelType === "select") {
		const libraryType = (await store.getValue(LIBRARY_TYPE, "select")) as string
		return libraryType === "pos" ? "zeus.log" : "aqua.log"
	}
	return `${getLocalCalendarYmd(new Date())}_日志.log`
}

function readLastNLines(filePath: string, maxLines = 1000): string {
	try {
		if (!fs.existsSync(filePath)) return ""
		const content = fs.readFileSync(filePath, "utf-8")
		const lines = content.split("\n")
		const start = Math.max(0, lines.length - maxLines)
		return lines.slice(start).join("\n")
	} catch (error) {
		logger.error(`[kernel-log] 读取日志文件失败: ${filePath}, ${error}`)
		return ""
	}
}

function readFromOffset(filePath: string, offset: number): string {
	try {
		if (!fs.existsSync(filePath)) return ""
		const stat = fs.statSync(filePath)
		if (stat.size <= offset) return ""
		const fd = fs.openSync(filePath, "r")
		const buffer = Buffer.alloc(stat.size - offset)
		fs.readSync(fd, buffer, 0, buffer.length, offset)
		fs.closeSync(fd)
		return buffer.toString("utf-8")
	} catch (error) {
		logger.error(`[kernel-log] 增量读取日志失败: ${filePath}, ${error}`)
		return ""
	}
}

const ALL_KERNEL_TYPES: KernelType[] = ["fuel", "select", "rocket"]

async function watchOneKernel(
	event: Electron.IpcMainInvokeEvent,
	kernelType: KernelType,
): Promise<{ success: boolean; error?: string }> {
	const pathArray = KERNEL_LOG_PATH_MAP[kernelType]
	if (!pathArray) {
		logger.error(`[kernel-log] 未知的内核类型: ${kernelType}`)
		return { success: false, error: `未知的内核类型: ${kernelType}` }
	}

	const existing = activeWatchers.get(kernelType)
	if (existing) {
		clearInterval(existing.timer)
		activeWatchers.delete(kernelType)
	}

	const logDir = await store.getAllDataPath(pathArray, true)
	const logFileName = await getLogFileName(kernelType)
	const logFilePath = path.join(logDir, logFileName)

	if (!fs.existsSync(logFilePath)) {
		const errMsg = `当天日志文件不存在: ${logFilePath}`
		logger.warn(`[kernel-log] ${errMsg}`)
	}

	logger.info(`[kernel-log] 开始监听 ${kernelType} 日志: ${logFilePath}`)

	const initialContent = readLastNLines(logFilePath, 1000)
	const senderWindow = BrowserWindow.fromWebContents(event.sender)

	if (senderWindow && !senderWindow.isDestroyed()) {
		senderWindow.webContents.send(
			IPC_CHANNELS.KERNEL_LOG_CHANGED,
			initialContent,
			kernelType,
			true,
		)
	}

	const lastSize = fs.existsSync(logFilePath)
		? fs.statSync(logFilePath).size
		: 0

	const timer = setInterval(() => {
		try {
			const current = activeWatchers.get(kernelType)
			if (!current) return

			if (!fs.existsSync(logFilePath)) return
			const stat = fs.statSync(logFilePath)

			if (stat.size > current.lastSize) {
				const newContent = readFromOffset(logFilePath, current.lastSize)
				current.lastSize = stat.size

				if (newContent && senderWindow && !senderWindow.isDestroyed()) {
					senderWindow.webContents.send(
						IPC_CHANNELS.KERNEL_LOG_CHANGED,
						newContent,
						kernelType,
						false,
					)
				}
			} else if (stat.size < current.lastSize) {
				const content = readLastNLines(logFilePath, 1000)
				current.lastSize = stat.size
				if (senderWindow && !senderWindow.isDestroyed()) {
					senderWindow.webContents.send(
						IPC_CHANNELS.KERNEL_LOG_CHANGED,
						content,
						kernelType,
						true,
					)
				}
			}
		} catch (error) {
			logger.error(`[kernel-log] 轮询 ${kernelType} 时出错: ${error}`)
		}
	}, POLL_INTERVAL_MS)

	trackWatcher(activeWatchers, kernelType, timer, lastSize, senderWindow)

	return { success: true }
}

async function watchKernelLogHandler(): Promise<void> {
	ipcMain.handle(IPC_CHANNELS.WATCH_KERNEL_LOG, async (event, kernelType?: KernelType) => {
		const typesToWatch: KernelType[] =
			kernelType !== undefined ? [kernelType] : ALL_KERNEL_TYPES

		for (const k of typesToWatch) {
			const result = await watchOneKernel(event, k)
			if (!result.success) return result
		}
		return { success: true }
	})
}

async function unwatchKernelLogHandler(): Promise<void> {
	ipcMain.handle(IPC_CHANNELS.UNWATCH_KERNEL_LOG, async (_, kernelType?: KernelType) => {
		if (kernelType) {
			const w = activeWatchers.get(kernelType)
			if (w) {
				clearInterval(w.timer)
				activeWatchers.delete(kernelType)
				logger.info(`[kernel-log] 停止监听 ${kernelType}`)
			}
		} else {
			for (const [key, w] of activeWatchers) {
				clearInterval(w.timer)
				logger.info(`[kernel-log] 停止监听 ${key}`)
			}
			activeWatchers.clear()
		}
		return { success: true }
	})
}

// -- 独立窗口
async function watchOneKernelIndependent(
	event: Electron.IpcMainInvokeEvent,
	kernelType: KernelType,
): Promise<{ success: boolean; error?: string }> {
	const pathArray = KERNEL_LOG_PATH_MAP[kernelType]
	if (!pathArray) {
		logger.error(`[kernel-log-individual] 未知的内核类型: ${kernelType}`)
		return { success: false, error: `未知的内核类型: ${kernelType}` }
	}

	const existing = activeWatchersIndependent.get(kernelType)
	if (existing) {
		clearInterval(existing.timer)
		activeWatchersIndependent.delete(kernelType)
	}

	const logDir = await store.getAllDataPath(pathArray, true)
	const logFileName = await getLogFileName(kernelType)
	const logFilePath = path.join(logDir, logFileName)

	if (!fs.existsSync(logFilePath)) {
		const errMsg = `当天日志文件不存在: ${logFilePath}`
		logger.warn(`[kernel-log-individual] ${errMsg}`)
	}

	logger.info(
		`[kernel-log-individual] 开始监听 ${kernelType} 日志: ${logFilePath}`,
	)

	const initialContent = readLastNLines(logFilePath, 1000)
	const senderWindow = BrowserWindow.fromWebContents(event.sender)

	if (senderWindow && !senderWindow.isDestroyed()) {
		senderWindow.webContents.send(
			IPC_CHANNELS.KERNEL_LOG_CHANGED_INDIVIDUAL,
			initialContent,
			kernelType,
			true,
		)
	}

	const lastSize = fs.existsSync(logFilePath)
		? fs.statSync(logFilePath).size
		: 0

	const timer = setInterval(() => {
		try {
			const current = activeWatchersIndependent.get(kernelType)
			if (!current) return

			if (!fs.existsSync(logFilePath)) return
			const stat = fs.statSync(logFilePath)

			if (stat.size > current.lastSize) {
				const newContent = readFromOffset(logFilePath, current.lastSize)
				current.lastSize = stat.size

				if (newContent && senderWindow && !senderWindow.isDestroyed()) {
					senderWindow.webContents.send(
						IPC_CHANNELS.KERNEL_LOG_CHANGED_INDIVIDUAL,
						newContent,
						kernelType,
						false,
					)
				}
			} else if (stat.size < current.lastSize) {
				const content = readLastNLines(logFilePath, 1000)
				current.lastSize = stat.size
				if (senderWindow && !senderWindow.isDestroyed()) {
					senderWindow.webContents.send(
						IPC_CHANNELS.KERNEL_LOG_CHANGED_INDIVIDUAL,
						content,
						kernelType,
						true,
					)
				}
			}
		} catch (error) {
			logger.error(
				`[kernel-log-individual] 轮询 ${kernelType} 时出错: ${error}`,
			)
		}
	}, POLL_INTERVAL_MS)

	trackWatcher(activeWatchersIndependent, kernelType, timer, lastSize, senderWindow)

	return { success: true }
}

async function watchIndividualKernelLogHandler(): Promise<void> {
	ipcMain.handle(
		IPC_CHANNELS.WATCH_INDIVIDUAL_KERNEL_LOG,
		async (event, kernelType?: KernelType) => {
			const typesToWatch: KernelType[] =
				kernelType !== undefined ? [kernelType] : ALL_KERNEL_TYPES

			for (const k of typesToWatch) {
				const result = await watchOneKernelIndependent(event, k)
				if (!result.success) return result
			}
			return { success: true }
		},
	)
}

async function unwatchIndividualKernelLogHandler(): Promise<void> {
	ipcMain.handle(
		IPC_CHANNELS.UNWATCH_INDIVIDUAL_KERNEL_LOG,
		async (_, kernelType?: KernelType) => {
			if (kernelType) {
				const w = activeWatchersIndependent.get(kernelType)
				if (w) {
					clearInterval(w.timer)
					activeWatchersIndependent.delete(kernelType)
					logger.info(`[kernel-log-individual] 停止监听 ${kernelType}`)
				}
			} else {
				for (const [key, w] of activeWatchersIndependent) {
					clearInterval(w.timer)
					logger.info(`[kernel-log-individual] 停止监听 ${key}`)
				}
				activeWatchersIndependent.clear()
			}
			return { success: true }
		},
	)
}

export const regKernelLogIPC = () => {
	watchKernelLogHandler()
	unwatchKernelLogHandler()
	watchIndividualKernelLogHandler()
	unwatchIndividualKernelLogHandler()
	console.log("[reg] kernel-log-ipc")
}
