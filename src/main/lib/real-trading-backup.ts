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
import { createWriteStream } from "node:fs"
import path from "node:path"
import store from "@/main/store/index.js"
import { loadTradingDaysFromPeriodOffsetCsv } from "@/main/utils/common.js"
import logger from "@/main/utils/wiston.js"
import {
	getLocalCalendarYmd,
	getLocalMidnightOfNthTradingDayBefore,
	isLocalYmdTradingDayInCalendar,
} from "@/shared/lib/trading-day.js"
import archiver from "archiver"
import Store from "electron-store"
import schedule from "node-schedule"

const backupStore = new Store<{
	realTradingBackupDailyTime?: string
	realTradingBackupEnabled?: boolean
}>()
const SCHEDULE_KEY = "realTradingBackupDailyTime" as const
const ENABLED_KEY = "realTradingBackupEnabled" as const
export const DEFAULT_REAL_TRADING_BACKUP_TIME = "15:10"

// -- 备份保留的交易日数（不含当日；配合当日备份约保留 3 份 zip）
const BACKUP_RETAIN_TRADING_DAYS = 2

// -- 生成 zip 文件名前缀
const BACKUP_ZIP_PREFIX = "real_trading_"

const RUN_CACHE_BACKUP_REL =
	"data/运行缓存/小中混_个股择时测试/股票预处理数据256.pkl"
const FACTOR_CACHE_BACKUP_REL = "data/因子缓存/股票预处理数据256-1h.pkl"

let scheduledJob: schedule.Job | null = null
let backupRunning = false

export interface RealTradingBackupConfigPayload {
	enabled: boolean
	dailyTime: string
	sourceDir: string
	backupDir: string
	warning?: string
}

async function resolveRealTradingBackupPaths(): Promise<
	| { ok: true; sourceDir: string; backupDir: string }
	| { ok: false; error: string }
> {
	const root = await store.getSetting("all_data_path", "")
	if (!root || String(root).trim() === "") {
		return {
			ok: false,
			error: "请先在设置中配置数据存储路径",
		}
	}
	const sourceDir = await store.getAllDataPath(["real_trading"], false)
	const backupDir = getRealTradingBackupDestDir(sourceDir)
	return { ok: true, sourceDir, backupDir }
}

export function getRealTradingBackupEnabled(): boolean {
	const stored = backupStore.get(ENABLED_KEY)
	return stored === undefined ? true : stored
}

export function setRealTradingBackupEnabled(enabled: boolean): { ok: true } {
	backupStore.set(ENABLED_KEY, enabled)
	refreshRealTradingBackupSchedule()
	return { ok: true }
}

export async function getRealTradingBackupConfigPayload(): Promise<RealTradingBackupConfigPayload> {
	const enabled = getRealTradingBackupEnabled()
	const dailyTime = getRealTradingBackupDailyTime()
	const paths = await resolveRealTradingBackupPaths()
	if (!paths.ok) {
		return {
			enabled,
			dailyTime,
			sourceDir: "",
			backupDir: "",
			warning: paths.error,
		}
	}
	return {
		enabled,
		dailyTime,
		sourceDir: paths.sourceDir,
		backupDir: paths.backupDir,
	}
}

function getRealTradingBackupDestDir(sourceDir: string): string {
	return path.join(path.dirname(sourceDir), "real_trading_backups")
}

async function shouldRunScheduledRealTradingBackup(): Promise<
	{ run: true } | { run: false; message: string }
> {
	const calendar = await loadTradingDaysFromPeriodOffsetCsv()
	if (calendar.length === 0) {
		return {
			run: false,
			message:
				"[real-trading-backup] 未读到 period_offset.csv 交易日历，跳过本次自动备份",
		}
	}
	const ymd = getLocalCalendarYmd(new Date())
	if (!isLocalYmdTradingDayInCalendar(calendar, ymd)) {
		return {
			run: false,
			message: `[real-trading-backup] 今日 ${ymd} 非交易日，跳过自动备份`,
		}
	}
	return { run: true }
}

// -- 备份保留策略：本地日历锚日下，往前第 n 个交易日 0 点（早于该时刻的备份可删）。
async function getBackupRetentionCutoffByTradingDays(options: {
	tradingDaysBack: number
	from?: Date
	filePath?: string
}): Promise<Date | null> {
	const { tradingDaysBack, from = new Date(), filePath } = options
	const calendar = await loadTradingDaysFromPeriodOffsetCsv(
		filePath ? { filePath } : {},
	)
	return getLocalMidnightOfNthTradingDayBefore(calendar, tradingDaysBack, from)
}

function parseTimeHHmm(s: string): { hour: number; minute: number } | null {
	const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
	if (!m) {
		return null
	}
	const hour = Number(m[1])
	const minute = Number(m[2])
	if (
		Number.isNaN(hour) ||
		Number.isNaN(minute) ||
		hour < 0 ||
		hour > 23 ||
		minute < 0 ||
		minute > 59
	) {
		return null
	}
	return { hour, minute }
}

// -- 删除早于「当前日历日锚定下、往前第 N 个交易日 0 点」之前生成的 zip
export async function cleanupOldRealTradingBackups(
	backupDir: string,
): Promise<void> {
	const cutoff = await getBackupRetentionCutoffByTradingDays({
		tradingDaysBack: BACKUP_RETAIN_TRADING_DAYS,
	})
	if (!cutoff) {
		logger.warn(
			"[real-trading-backup] 无法根据 period_offset.csv 计算交易日截止点，跳过按交易日清理",
		)
		return
	}
	if (!fs.existsSync(backupDir)) {
		return
	}
	const entries = fs.readdirSync(backupDir, { withFileTypes: true })
	for (const e of entries) {
		if (
			!e.isFile() ||
			!e.name.startsWith(BACKUP_ZIP_PREFIX) ||
			!e.name.endsWith(".zip")
		) {
			continue
		}
		const fp = path.join(backupDir, e.name)
		let st: fs.Stats
		try {
			st = fs.statSync(fp)
		} catch {
			continue
		}
		if (st.mtime < cutoff) {
			try {
				fs.unlinkSync(fp)
				logger.info(`[real-trading-backup] 已删除过期备份: ${fp}`)
			} catch (err) {
				logger.error(`[real-trading-backup] 删除过期备份失败 ${fp}: ${err}`)
			}
		}
	}
}

async function getPosStrategyNames(): Promise<string[]> {
	const list = (await store.getValue("pos_mgmt.strategies", [])) as Array<{
		name?: unknown
	}>
	return Array.isArray(list)
		? list.map((x) => String(x?.name ?? "").trim()).filter((s) => s.length > 0)
		: []
}

async function getSelectStockStrategyNames(): Promise<string[]> {
	const list = (await store.getValue(
		"select_stock.strategy_list",
		[],
	)) as Array<{ name?: unknown }>
	return Array.isArray(list)
		? list.map((x) => String(x?.name ?? "").trim()).filter((s) => s.length > 0)
		: []
}

function childMatchesKeywords(childName: string, keywords: string[]): boolean {
	if (keywords.length === 0) return false
	const lower = childName.toLowerCase()
	return keywords.some((k) => {
		const kl = k.toLowerCase()
		return kl.length > 0 && lower.includes(kl)
	})
}

interface CopyStats {
	copiedItems: number
	skippedMissing: string[]
}

function posixZipEntry(rootName: string, rel: string): string {
	const parts = rel.split(/[/\\]/).filter((p) => p.length > 0)
	return path.posix.join(rootName, ...parts)
}

function addMatchedChildrenToArchive(
	archive: archiver.Archiver,
	realTradingRoot: string,
	rootName: string,
	relDir: string,
	keywords: string[],
	includeAlways: string[],
): number {
	const absDir = path.join(realTradingRoot, relDir)
	if (!fs.existsSync(absDir)) {
		return 0
	}
	let count = 0
	const children = fs.readdirSync(absDir, { withFileTypes: true })
	for (const c of children) {
		const matched =
			includeAlways.includes(c.name) || childMatchesKeywords(c.name, keywords)
		if (!matched) continue
		const csrc = path.join(absDir, c.name)
		const destInZip = posixZipEntry(rootName, path.join(relDir, c.name))
		try {
			if (c.isDirectory()) {
				archive.directory(csrc, destInZip)
			} else {
				archive.file(csrc, { name: destInZip })
			}
			count++
		} catch (err) {
			logger.error(`[real-trading-backup] 加入压缩包失败 ${csrc}: ${err}`)
		}
	}
	return count
}

// -- 压缩实盘数据规则
async function addFilteredRealTradingToArchive(
	archive: archiver.Archiver,
	realTradingRoot: string,
	rootName: string,
	ymd: string,
): Promise<CopyStats> {
	const posNames = await getPosStrategyNames()
	const selectNames = await getSelectStockStrategyNames()
	const stats: CopyStats = { copiedItems: 0, skippedMissing: [] }

	const addFile = (rel: string) => {
		const src = path.join(realTradingRoot, rel)
		if (!fs.existsSync(src)) {
			stats.skippedMissing.push(rel)
			return
		}
		archive.file(src, { name: posixZipEntry(rootName, rel) })
		stats.copiedItems++
	}

	const addTree = (rel: string) => {
		const src = path.join(realTradingRoot, rel)
		if (!fs.existsSync(src)) {
			stats.skippedMissing.push(rel)
			return
		}
		archive.directory(src, posixZipEntry(rootName, rel))
		stats.copiedItems++
	}

	for (const rel of [
		`data/ui_status/fusion-stats-${ymd}.json`,
		`data/ui_views/fusion-views-${ymd}.json`,
	]) {
		addFile(rel)
	}

	for (const rel of ["data/实盘选股结果", "rocket/data"]) {
		addTree(rel)
	}

	for (const rel of [RUN_CACHE_BACKUP_REL, FACTOR_CACHE_BACKUP_REL]) {
		addFile(rel)
	}

	stats.copiedItems += addMatchedChildrenToArchive(
		archive,
		realTradingRoot,
		rootName,
		"data/仓管子策略",
		posNames,
		[],
	)

	stats.copiedItems += addMatchedChildrenToArchive(
		archive,
		realTradingRoot,
		rootName,
		"data/实盘信息",
		[...posNames, ...selectNames],
		[ymd],
	)

	return stats
}

export interface RealTradingBackupResult {
	ok: boolean
	zipPath?: string
	error?: string
	// -- 仅自动调度：非交易日或未读日历等，未执行备份
	skipped?: boolean
}

export interface RunRealTradingBackupOptions {
	// -- 定时任务触发时为 true：仅交易日才执行备份
	autoSchedule?: boolean
}

// -- 按规则将 real_trading 选中内容打成 zip，并清理过期备份
export async function runRealTradingBackup(
	options?: RunRealTradingBackupOptions,
): Promise<RealTradingBackupResult> {
	if (backupRunning) {
		return { ok: false, error: "备份正在进行中，请稍候再试" }
	}

	if (options?.autoSchedule) {
		if (!getRealTradingBackupEnabled()) {
			logger.info("[real-trading-backup] 自动备份已关闭，跳过本次自动备份")
			return { ok: true, skipped: true }
		}
		const gate = await shouldRunScheduledRealTradingBackup()
		if (!gate.run) {
			logger.info(gate.message)
			return { ok: true, skipped: true }
		}
	}

	backupRunning = true
	const paths = await resolveRealTradingBackupPaths()
	if (!paths.ok) {
		backupRunning = false
		return { ok: false, error: paths.error }
	}
	const { sourceDir, backupDir } = paths

	if (!fs.existsSync(sourceDir)) {
		backupRunning = false
		return {
			ok: false,
			error: `源目录不存在：${sourceDir}。请确认在设置的存储路径下已有 real_trading 目录。`,
		}
	}

	try {
		fs.mkdirSync(backupDir, { recursive: true })
	} catch (e) {
		backupRunning = false
		const msg = e instanceof Error ? e.message : String(e)
		return { ok: false, error: `无法创建备份目录：${msg}` }
	}

	try {
		await cleanupOldRealTradingBackups(backupDir)
	} catch (e) {
		backupRunning = false
		const msg = e instanceof Error ? e.message : String(e)
		return { ok: false, error: `清理旧备份失败：${msg}` }
	}

	const ts = new Date()
	const ymd = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, "0")}-${String(ts.getDate()).padStart(2, "0")}`
	const stamp = `${ymd}_${String(ts.getHours()).padStart(2, "0")}${String(ts.getMinutes()).padStart(2, "0")}${String(ts.getSeconds()).padStart(2, "0")}`
	const zipPath = path.join(backupDir, `${BACKUP_ZIP_PREFIX}${stamp}.zip`)
	const rootName = path.basename(sourceDir)

	return new Promise((resolve) => {
		const output = createWriteStream(zipPath)
		const archive = archiver("zip", { zlib: { level: 0 } })

		let copyStats: CopyStats = { copiedItems: 0, skippedMissing: [] }

		const finish = (result: RealTradingBackupResult) => {
			backupRunning = false
			resolve(result)
		}

		output.on("close", () => {
			logger.info(
				`[real-trading-backup] 备份完成: ${zipPath}（${archive.pointer()} 字节）`,
			)
			finish({ ok: true, zipPath })
		})

		output.on("error", (err) => {
			try {
				fs.unlinkSync(zipPath)
			} catch {}
			logger.error(`[real-trading-backup] 输出流错误: ${err}`)
			finish({ ok: false, error: err.message })
		})

		archive.on("error", (err) => {
			try {
				output.close()
			} catch {}
			try {
				fs.unlinkSync(zipPath)
			} catch {}
			logger.error(`[real-trading-backup] 压缩错误: ${err}`)
			finish({ ok: false, error: err.message })
		})

		archive.pipe(output)

		void (async () => {
			try {
				copyStats = await addFilteredRealTradingToArchive(
					archive,
					sourceDir,
					rootName,
					ymd,
				)
				logger.info(
					`[real-trading-backup] 已加入压缩 ${copyStats.copiedItems} 个顶层项，缺失 ${copyStats.skippedMissing.length}`,
				)
				if (copyStats.skippedMissing.length > 0) {
					logger.info(
						`[real-trading-backup] 跳过不存在的项: ${copyStats.skippedMissing.join(", ")}`,
					)
				}
				void archive.finalize()
			} catch (e) {
				try {
					fs.unlinkSync(zipPath)
				} catch {}
				const msg = e instanceof Error ? e.message : String(e)
				logger.error(`[real-trading-backup] 备份失败: ${msg}`)
				finish({ ok: false, error: `备份失败：${msg}` })
			}
		})()
	})
}

export function getRealTradingBackupDailyTime(): string {
	return (
		(backupStore.get(SCHEDULE_KEY) as string | undefined) ||
		DEFAULT_REAL_TRADING_BACKUP_TIME
	)
}

export function setRealTradingBackupDailyTime(timeHHmm: string): {
	ok: boolean
	error?: string
} {
	const parsed = parseTimeHHmm(timeHHmm)
	if (!parsed) {
		return { ok: false, error: "时间格式须为 HH:mm（24 小时制）" }
	}
	const normalized = `${String(parsed.hour).padStart(2, "0")}:${String(parsed.minute).padStart(2, "0")}`
	backupStore.set(SCHEDULE_KEY, normalized)
	refreshRealTradingBackupSchedule()
	return { ok: true }
}

export function refreshRealTradingBackupSchedule(): void {
	if (scheduledJob) {
		scheduledJob.cancel()
		scheduledJob = null
	}
	if (!getRealTradingBackupEnabled()) {
		logger.info("[real-trading-backup] 自动备份已关闭，未设置自动备份计划")
		return
	}
	const timeStr = getRealTradingBackupDailyTime()
	const parsed = parseTimeHHmm(timeStr)
	if (!parsed) {
		logger.warn(`[real-trading-backup] 无效的计划时间，跳过调度: ${timeStr}`)
		return
	}

	const rule = new schedule.RecurrenceRule()
	rule.hour = parsed.hour
	rule.minute = parsed.minute
	rule.second = 0

	scheduledJob = schedule.scheduleJob(rule, () => {
		void runRealTradingBackup({ autoSchedule: true }).then((r) => {
			if (!r.ok) {
				logger.error(`[real-trading-backup] 定时备份失败: ${r.error}`)
			}
		})
	})

	logger.info(
		`[real-trading-backup] 已设置每日 ${normalizedDailyLabel(parsed)} 自动备份（仅交易日执行）`,
	)
}

function normalizedDailyLabel(parsed: {
	hour: number
	minute: number
}): string {
	return `${String(parsed.hour).padStart(2, "0")}:${String(parsed.minute).padStart(2, "0")}`
}
