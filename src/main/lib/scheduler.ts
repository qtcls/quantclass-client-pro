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
import { execBin } from "@/main/lib/process.js"
import { userStore } from "@/main/lib/userStore.js"
import { rStore } from "@/main/store/index.js"
import {
	isAnyKernalBusy,
	isKernalBusy,
	isKernalRunning,
	isTradingTime,
	killKernalByForce,
} from "@/main/utils/tools.js"
import logger from "@/main/utils/wiston.js"
import { LIBRARY_TYPE } from "@/shared/constants.js"
import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import {
	isRealMarketDataUsable,
	validateTradingPreconditions,
} from "@/shared/lib/trading-guard.js"
import type { SetAutoTradingAck } from "@/shared/types/trading.js"
import type { UserAccount } from "@/shared/types/user.js"
import { platform } from "@electron-toolkit/utils"
import dayjs from "dayjs"
import isBetween from "dayjs/plugin/isBetween.js"
import Store from "electron-store"
import schedule from "node-schedule"

const _store = new Store()

dayjs.extend(isBetween)

// -- 将状态相关的常量和类型定义集中管理
interface SystemState {
	isSetAutoUpdate: boolean
	isSetAutoTrading: boolean
	isSetAutoMinData: boolean
	job: schedule.Job | null
	minDataJob: schedule.Job | null
	minDataMode: "fast" | "stable"
	minDataAccurate: boolean
	minDataFuzzy: boolean
	isOnline: boolean
}

// -- 系统状态
const systemState: SystemState = {
	isSetAutoUpdate: false,
	isSetAutoTrading: false,
	isSetAutoMinData: false,
	job: null,
	minDataJob: null,
	minDataMode: "fast",
	minDataAccurate: true,
	minDataFuzzy: true,
	isOnline: true,
}

/**
 * 初始化系统状态
 */
async function initializeSystem() {
	try {
		// -- 非 Windows 平台到此结束
		if (!platform.isWindows) return

		// 强制更新用户信息
		const userInfo = await userStore.getUserAccount(true)

		// 若未获取到或不是共享会会员则return
		if (!userInfo?.isMember) return
	} catch (error) {
		logger.error(`系统初始化失败: ${error}`)
		throw error // -- 向上抛出错误，让调用方处理
	}
}

/**
 * 取消定时任务
 */
const cancelScheduler = () => {
	logger.info("[scheduler] 取消定时任务")
	if (systemState.job !== null) {
		systemState.job.cancel()
		systemState.job = null
	}
}

/**
 * 获取当前15分钟时间，格式为 "HH:mm"，如 "00:00"、"00:15"
 */
function getCurrent15m(): string {
	const now = dayjs()
	const hour = now.hour().toString().padStart(2, "0")
	const minute = Math.floor(now.minute() / 15) * 15
	const minuteStr = minute.toString().padStart(2, "0")
	return `${hour}:${minuteStr}`
}

/**
 * 读取自动实盘前置校验上下文（main 权威源，每次实时读取）。
 * - libraryType 每次现读，避免闭包陈旧值（加固B）。
 * - 策略列表来自 electron-store（main 唯一可读源），由 renderer sync* await 写入。
 */
async function readTradingGuardContext(): Promise<{
	strategies: unknown
	realMarketConfig: unknown
}> {
	const libraryType = (await _store.get(LIBRARY_TYPE, "select")) as string
	const strategies = await _store.get(
		libraryType === "pos" ? "pos_mgmt.strategies" : "select_stock.strategy_list",
		[],
	)
	const realMarketConfig = await _store.get("real_market_config", {})
	return { strategies, realMarketConfig }
}

/**
 * 确认 rocket 已停止。强杀存在进程终止延迟，做有界重试避免误报「终止失败」。
 * 一旦确认停止立即返回 true；用尽尝试仍在运行返回 false（诚实报失败）。
 */
async function confirmRocketStopped(attempts = 3, intervalMs = 400): Promise<boolean> {
	for (let i = 0; i < attempts; i++) {
		if (!(await isKernalRunning("rocket", true))) return true
		if (i < attempts - 1) {
			await new Promise((resolve) => setTimeout(resolve, intervalMs))
		}
	}
	return false
}

/**
 * 启动定时任务
 */
const setupScheduler = async (): Promise<schedule.Job> => {
	// -- 重置已存在的调度任务
	cancelScheduler()
	const mw = windowManager.getWindow()
	try {
		mw?.webContents.send(IPC_CHANNELS.SEND_SCHEDULE_STATUS, "init")
		await initializeSystem()
	} catch (error) {
		mw?.webContents.send(IPC_CHANNELS.SEND_SCHEDULE_STATUS, "error")
		throw error
	}

	/**
	 * 定时任务：每分钟执行一次
	 * - 检查网络状态
	 * - 检查用户登录状态
	 * - 唤醒 Rocket
	 * - 唤醒 Fuel
	 * - 唤醒 Aqua
	 */
	systemState.job = schedule.scheduleJob("* * * * *", async () => {
		logger.info(">>>>>>>>>>>>>>>> scheduler start <<<<<<<<<<<<<<<<")
		const userAccount = await userStore.getUserAccount() // -- 获取用户状态
		const allowConcurrentFuelTasks = isTradingTime()
		// -- 每次 tick 现读当前 libraryType（加固B：避免 setupScheduler 时闭包的陈旧值）
		const libraryType = (await _store.get(LIBRARY_TYPE, "select")) as string

		mw?.webContents.send(IPC_CHANNELS.SEND_SCHEDULE_STATUS, "start")
		logger.info(
			`[scheduler] 自动数据: ${systemState.isSetAutoUpdate}, 自动下单: ${systemState.isSetAutoTrading}, 在线: ${systemState.isOnline}, 用户登录: ${userAccount?.isLoggedIn}`,
		)

		// -- 检查网络状态
		if (!systemState.isOnline) {
			logger.info("[network] 网络离线，跳过本轮调度")
			mw?.webContents.send(IPC_CHANNELS.SEND_SCHEDULE_STATUS, "outline")
			return
		}

		// -- 检查用户登录：未登录直接返回
		if (!userAccount?.isLoggedIn) {
			logger.info("[user] 用户未登录，跳过本轮调度")
			return
		}

		// 2025-05-29，目前仍然只支持Windows系统下单，mac 上最多支持手动回测
		const requireTrading = systemState.isSetAutoTrading && platform.isWindows

		// -- 检查是否设置自动更新数据，如果设置了，唤醒 Rocket
		if (requireTrading) await wakeUpRocket(userAccount, mw)

		if (
			await isAnyKernalBusy(
				allowConcurrentFuelTasks ? ["aqua", "zeus"] : ["aqua", "fuel", "zeus"],
			)
		) {
			logger.info("[scheduler] 内核正忙，跳过本轮调度")
			return
		}

		// -- 当设置自动更新数据的时候，自动唤醒Fuel

		if (systemState.isSetAutoUpdate) {
			// -- 获取定时任务时间
			const dataModuleTimes = (await _store.get(
				"schedule.dataModule",
				[],
			)) as string[]
			const dataModuleAuto = dataModuleTimes.length === 0
			const current15m = getCurrent15m()
			const isScheduleDataModule =
				dataModuleAuto || dataModuleTimes.includes(current15m)
			logger.info(
				`[scheduler-fuel] 数据模块定时任务: ${dataModuleTimes}, 当前时间: ${current15m}, 是否更新: ${isScheduleDataModule}`,
			)
			const isFuelBusy = await isKernalBusy("fuel")
			if (isFuelBusy && !allowConcurrentFuelTasks) {
				logger.info("[fuel] 内核正忙，跳过本轮调度")
			} else if (!isScheduleDataModule) {
				logger.info("[fuel] 非定时更新数据时间，跳过本轮数据更新")
			} else {
				await wakeUpFuel(mw)
			}
		}

		// -- 当设置自动下单的时候，自动唤醒Aqua or Zeus
		if (requireTrading) {
			// -- 获取定时任务时间
			const selectModuleTimes = (await _store.get(
				"schedule.selectModule",
				[],
			)) as string[]
			const selectModuleAuto = selectModuleTimes.length === 0
			const current15m = getCurrent15m()
			const isScheduleSelectModule =
				selectModuleAuto || selectModuleTimes.includes(current15m)
			logger.info(
				`[scheduler-select] 选股模块定时任务: ${selectModuleTimes}, 当前时间: ${current15m}, 是否更新: ${isScheduleSelectModule}`,
			)

			logger.info(`[libraryType] 策略类型${libraryType}`)
			switch (libraryType) {
				case "pos":
					if (await isKernalBusy("zeus")) {
						logger.info("[zeus] 内核正忙，跳过本轮调度")
					} else if (!isScheduleSelectModule) {
						logger.info("[zeus] 非定时选股时间，跳过本轮选股")
					} else {
						await wakeUpZeus(userAccount, mw)
					}
					break
				case "select":
					if (await isKernalBusy("aqua")) {
						logger.info("[aqua] 内核正忙，跳过本轮调度")
					} else if (!isScheduleSelectModule) {
						logger.info("[aqua] 非定时选股时间，跳过本轮选股")
					} else {
						await wakeUpAqua(userAccount, mw)
					}
					break
			}
		} else {
			logger.info("[scheduler] 未启用自动实盘或者非Windows系统，跳过本轮调度")
		}
		mw?.webContents.send(IPC_CHANNELS.SEND_SCHEDULE_STATUS, "done")
		logger.info(">>>>>>>>>>>>>>>> scheduler done <<<<<<<<<<<<<<<<")
	})

	return systemState.job
}

// -- 处理自动更新逻辑
async function wakeUpFuel(mw) {
	try {
		logger.info("[fuel] 自动更新所有数据...")
		mw?.webContents.send(IPC_CHANNELS.SEND_SCHEDULE_STATUS, "fuel_start")
		await execBin(["all_data"], "自动更新所有数据")
	} catch (error) {
		logger.info(`[scheduler] runtime error(${error})`)
	} finally {
	}
}

async function wakeUpAqua(userAccount: UserAccount, mw) {
	if (!userAccount?.isMember || !platform.isWindows) {
		logger.info(`[Aqua] 非分享会状态，跳过Aqua，${userAccount?.user}`)
		return
	}
	try {
		mw?.webContents.send(IPC_CHANNELS.SEND_SCHEDULE_STATUS, "aqua_start")
		await execBin(["select", "trading"], "选股", "aqua")
	} catch (error) {
		logger.info(`[aqua] runtime error(${error})`)
	} finally {
	}
}

async function wakeUpZeus(userAccount: UserAccount, mw) {
	if (!userAccount?.isMember || !platform.isWindows) {
		logger.info(`[zeus] 非分享会状态，跳过zeus，${userAccount?.user}`)
		return
	}
	logger.info("[zeus] 正在调用zeus")
	try {
		mw?.webContents.send(IPC_CHANNELS.SEND_SCHEDULE_STATUS, "aqua_start")
		await execBin(["select", "trading"], "选股", "zeus")
	} catch (error) {
		logger.info(`[aqua] runtime error(${error})`)
	} finally {
	}
}

// -- 处理实盘交易逻辑。
// -- 依次门控（任一不满足即跳过/不唤醒 rocket）：
// --   ① 非 Windows → ② 前置校验失败(策略/权重/QMT，含 account_id 手动模式哨兵)
// --   → ③ 非分享会会员 → ④ 非交易时段。四道全通过才唤醒 rocket。
async function wakeUpRocket(userAccount: UserAccount, mw) {
	// -- ① 非 Windows 系统无法下单
	if (!platform.isWindows) {
		logger.info("[rocket] 非 Windows 系统，Rocket无法自动下单")
		return
	}

	// -- main cron 强制前置校验（INV1：无正权重/坏配置不下单；Q1：account_id 哨兵已并入 isQmtConfigured）
	const { strategies, realMarketConfig } = await readTradingGuardContext()
	const result = validateTradingPreconditions({
		strategies,
		realMarketConfig,
		requireDataUpdating: false,
	})
	if (!result.ok) {
		// -- 不清 isSetAutoTrading（无 main→renderer 回推通道，清了会造成脑裂；仅作安全联锁）
		logger.info(`[rocket] 实盘前置条件不满足(${result.code})，不启动 Rocket`)
		mw?.webContents.send(IPC_CHANNELS.SEND_SCHEDULE_STATUS, "noTradingConfig")
		// -- 若已有 rocket 在跑（如刚切手动模式/清零权重），从 MAIN 强杀
		if (await isKernalRunning("rocket", true)) {
			logger.info("[rocket] 前置条件不满足但 Rocket 在运行，强制杀死")
			await killKernalByForce("rocket", true)
		}
		return
	}

	// -- S2b：real_market_25.json 自检（最后一道：rocket 即将经 ROCKET_STR_INFO_PATH 读此文件下单）。
	// -- 不可用（空/缺字段/无正权重）则 fail-closed 不唤醒；若已有 rocket 在跑（坏文件下单风险）从 MAIN 强杀，
	// -- 与前置守卫失败同口径。仅自检，无法判定「结构正确但 stale」，残余风险见 S3/S4。
	if (!isRealMarketDataUsable(rStore.store)) {
		logger.warn(
			"[rocket] real_market_25.json 不可用（空/缺字段/无正权重），不启动 Rocket",
		)
		mw?.webContents.send(IPC_CHANNELS.SEND_SCHEDULE_STATUS, "noTradingConfig")
		if (await isKernalRunning("rocket", true)) {
			logger.warn("[rocket] 文件不可用但 Rocket 在运行，强制杀死")
			await killKernalByForce("rocket", true)
		}
		return
	}

	// -- ③ 非分享会会员跳过（保留原门控）
	if (!userAccount?.isMember) {
		logger.info(`[trade] 非分享会状态，跳过Rocket，${userAccount?.user}`)
		return
	}

	// -- ④ 交易条件检查（非交易时段不唤醒）
	const shouldWakeUp = isTradingTime()
	if (!shouldWakeUp) {
		logger.info("[rocket] 非交易日，不唤醒Rocket")
		mw?.webContents.send(IPC_CHANNELS.SEND_SCHEDULE_STATUS, "noTradingTime")
		// await new Promise((resolve) => setTimeout(resolve, 10000))
		return
	}
	// -- 启动 rocket
	mw?.webContents.send(IPC_CHANNELS.SEND_SCHEDULE_STATUS, "rocket_start")
	await startRocketIfNeeded()
}

// -- 启动 rocket 服务
async function startRocketIfNeeded() {
	logger.info("[rocket] 交易时间，确认 rocket 状态")
	const rocketBusy = await isKernalBusy("rocket")
	if (!rocketBusy) {
		try {
			await execBin(["run"], "启动 rocket", "rocket")
		} catch (e) {
			logger.error(`[rocket] 异常 ${e}`)
		}
	} else {
		logger.warn("[rocket] 已在运行中，跳过操作")
	}
}

/**
 * 切换定时任务状态，前端启动或者停止定时任务的函数
 * @param {Boolean} isOn - 是否启用定时任务
 */
const setAutoUpdate = async (isOn: boolean): Promise<void> => {
	systemState.isSetAutoUpdate = isOn
	logger.info(`[fuel] 自动更新数据: ${systemState.isSetAutoUpdate}`)

	// -- 如果关闭自动更新，取消定时任务
	if (!isOn) {
		cancelScheduler()
		return
	}

	// -- 启动定时任务（await 建立，确保 systemState.job 就绪后再返回，并捕获 setupScheduler 异步异常）
	try {
		await setupScheduler() // -- 调用 schedule 主进程
	} catch (error) {
		// -- schedule 启动失败
		systemState.isSetAutoUpdate = false
		const mainWindow = windowManager.getWindow()
		mainWindow?.webContents.send(
			IPC_CHANNELS.SEND_UPDATE_STATUS,
			systemState.isSetAutoUpdate,
		)
		logger.error(
			`[fuel] 设置自动更新失败: ${systemState.isSetAutoUpdate}, 错误(${error})`,
		)
	}
}

/**
 * 权威关闭实盘：置意图 OFF + 写穿 store（INV5）+ 从 MAIN 强杀 rocket（INV2）+ 有界确认停止（加固D）。
 * ⚠️ 必须强杀：意图 OFF 后 cron 的 requireTrading 门控不再调 wakeUpRocket，
 *    故若不在此处强杀，已运行的 rocket 会成为「孤儿」继续下单（fail-open）。
 * 不调 cancelScheduler()（INV4：数据/min-data 调度须续跑）。
 * @returns rocketStopped 是否确认 rocket 已停止
 */
async function enforceTradingOff(): Promise<{ rocketStopped: boolean }> {
	// -- 1) 意图置 OFF（内存赋值不会抛）
	systemState.isSetAutoTrading = false
	logger.info(`[trade] 自动交易关闭: ${systemState.isSetAutoTrading}`)

	// -- 2) 写穿 store —— 即便失败也必须继续强杀（强杀是最关键的 fail-closed 动作，绝不可被 store 写失败阻断）
	try {
		_store.set("auto_real_trading", false)
	} catch (error) {
		logger.error(`[trade] 写 auto_real_trading=false 失败: ${error}`)
	}

	// -- 3) INV2：从 MAIN 强杀 rocket
	try {
		await killKernalByForce("rocket", true)
	} catch (error) {
		logger.error(`[trade] 强杀 rocket 失败: ${error}`)
	}

	// -- 4) 加固D：有界确认停止；确认过程异常按「未确认停止」处理（fail-closed → ack ok:false）
	try {
		const rocketStopped = await confirmRocketStopped()
		return { rocketStopped }
	} catch (error) {
		logger.error(`[trade] 确认 rocket 停止异常: ${error}`)
		return { rocketStopped: false }
	}
}

/**
 * 切换自动实盘（主进程权威）。返回定义良好的 ack 供 renderer await。
 * - enable：main 自校验前置条件（加固B），通过才置意图 + 建立调度；ack 在 job 就绪后派生（加固C）。
 *   任一失败（前置不过 / scheduler 未建立）走 enforceTradingOff —— 偏 OFF 且强杀 rocket，与 renderer 失败偏 OFF 一致。
 * - disable：enforceTradingOff（MAIN 强杀），确认停止后给诚实 ack。
 * - fail-closed：任何失败都偏向「关闭实盘」；rocketRunning 始终取真实快照（INV9）。
 */
const setAutoTrading = async (isOn: boolean): Promise<SetAutoTradingAck> => {
	if (isOn) {
		// -- main 权威自校验（加固B：防 renderer bug / 旧版 / 裸 IPC 绕过 enable）
		const { strategies, realMarketConfig } = await readTradingGuardContext()
		const result = validateTradingPreconditions({
			strategies,
			realMarketConfig,
			requireDataUpdating: false,
		})
		if (!result.ok) {
			// -- 交互式 enable 失败：fail-closed 权威关闭（renderer 在 !ok 时也偏 OFF，避免脑裂）
			logger.warn(`[trade] 自动实盘前置校验未通过(${result.code})，拒绝开启并 fail-closed 关闭`)
			const { rocketStopped } = await enforceTradingOff()
			return {
				ok: false,
				isSetAutoTrading: false,
				schedulerRunning: systemState.job !== null,
				rocketRunning: !rocketStopped,
				reason: result.code,
			}
		}

		// -- S2b：real_market_25.json shape+正权重自检（rocket 经 ROCKET_STR_INFO_PATH 读此文件下单）；
		// -- 不可用则 fail-closed 拒绝开启（防 renderer 漏写 / 裸 IPC / 坏文件启动）。仅自检，残余风险见 S3/S4。
		if (!isRealMarketDataUsable(rStore.store)) {
			logger.warn(
				"[trade] real_market_25.json 不可用（空/缺字段/无正权重），拒绝开启并 fail-closed 关闭",
			)
			const { rocketStopped } = await enforceTradingOff()
			return {
				ok: false,
				isSetAutoTrading: false,
				schedulerRunning: systemState.job !== null,
				rocketRunning: !rocketStopped,
				reason: "real_market_data_invalid",
			}
		}

		systemState.isSetAutoTrading = true
		_store.set("auto_real_trading", true) // -- 写穿镜像（INV5）
		logger.info(`[trade] 自动交易: ${systemState.isSetAutoTrading}`)

		// -- 自动交易开启时自动更新也要开启（保留既有语义；仅在未开启时建立）
		if (!systemState.isSetAutoUpdate) {
			await setAutoUpdate(true)
		}

		// -- 加固C：ack 在 scheduler 建立（systemState.job 就绪）后派生，避免虚报 schedulerRunning
		if (systemState.job === null) {
			// -- scheduler 未能建立 → fail-closed 关闭意图并强杀
			logger.error("[trade] 定时任务未能建立，回滚自动交易意图")
			const { rocketStopped } = await enforceTradingOff()
			return {
				ok: false,
				isSetAutoTrading: false,
				schedulerRunning: false,
				rocketRunning: !rocketStopped,
				reason: "scheduler_failed",
			}
		}

		// -- rocketRunning 仅为快照（INV9）：rocket 由 cron tick 在交易时段才启动，非交易时段合法 idle
		const rocketRunning = await isKernalRunning("rocket", true)
		return {
			ok: true,
			isSetAutoTrading: true,
			schedulerRunning: true,
			rocketRunning,
		}
	}

	// -- disable（用户主动关闭）
	const { rocketStopped } = await enforceTradingOff()
	return {
		ok: rocketStopped,
		isSetAutoTrading: false,
		schedulerRunning: systemState.job !== null,
		rocketRunning: !rocketStopped,
		reason: rocketStopped ? undefined : "kill_failed",
	}
}

// ============================================================================
// 实时数据（min data）定时任务
// ============================================================================

function isMinDataScheduleTime(): boolean {
	const now = dayjs()
	const day = now.day()
	if (day === 0 || day === 6) return false

	const timeInMinutes = now.hour() * 60 + now.minute()
	const isMorning =
		timeInMinutes >= 9 * 60 + 16 && timeInMinutes <= 11 * 60 + 26
	const isAfternoon =
		timeInMinutes >= 13 * 60 + 1 && timeInMinutes <= 15 * 60 + 1
	return isMorning || isAfternoon
}

const cancelMinDataScheduler = () => {
	if (systemState.minDataJob !== null) {
		systemState.minDataJob.cancel()
		systemState.minDataJob = null
	}
}

async function wakeUpMinData() {
	const mw = windowManager.getWindow()
	const userAccount = await userStore.getUserAccount()
	const allowConcurrentFuelTasks = isTradingTime()

	if (!systemState.isOnline) {
		logger.info("[min-data] 网络离线，跳过本轮")
		mw?.webContents.send(IPC_CHANNELS.MIN_DATA_SCHEDULE_STATUS, {
			type: "skipped",
			reason: "offline",
		})
		return
	}

	if (!userAccount?.isLoggedIn) {
		logger.info("[min-data] 用户未登录，跳过本轮")
		mw?.webContents.send(IPC_CHANNELS.MIN_DATA_SCHEDULE_STATUS, {
			type: "skipped",
			reason: "unauthorized",
		})
		return
	}

	if (!isMinDataScheduleTime()) {
		logger.info("[min-data] 非交易时间，跳过本轮")
		return
	}

	const isFuelBusy = await isKernalBusy("fuel")
	if (isFuelBusy && !allowConcurrentFuelTasks) {
		logger.info("[min-data] Fuel 内核正忙，跳过本轮")
		mw?.webContents.send(IPC_CHANNELS.MIN_DATA_SCHEDULE_STATUS, {
			type: "skipped",
			reason: "busy",
		})
		return
	}

	if (systemState.minDataFuzzy) {
		mw?.webContents.send(IPC_CHANNELS.MIN_DATA_SCHEDULE_STATUS, {
			type: "executing",
			task: "fuzzy",
		})
		try {
			await execBin(["min_data_fuzzy"], "定时获取模糊QMT数据")
			logger.info("[min-data] 模糊数据获取完成")
		} catch (error) {
			logger.error(`[min-data] 模糊数据获取失败: ${error}`)
		}
	}

	if (systemState.minDataAccurate) {
		mw?.webContents.send(IPC_CHANNELS.MIN_DATA_SCHEDULE_STATUS, {
			type: "executing",
			task: "accurate",
		})
		try {
			const args =
				systemState.minDataMode === "stable"
					? ["min_data", "thread"]
					: ["min_data"]
			const action = `定时获取准确QMT数据-${systemState.minDataMode === "stable" ? "稳定" : "极速"}模式`
			await execBin(args, action)
			logger.info("[min-data] 准确数据获取完成")
		} catch (error) {
			logger.error(`[min-data] 准确数据获取失败: ${error}`)
		}
	}

	mw?.webContents.send(IPC_CHANNELS.MIN_DATA_SCHEDULE_STATUS, { type: "done" })
}

const setupMinDataScheduler = () => {
	cancelMinDataScheduler()
	systemState.minDataJob = schedule.scheduleJob("1/5 * * * 1-5", wakeUpMinData)
	logger.info(
		`[min-data] 定时任务已启动，模式: ${systemState.minDataMode}, 准确: ${systemState.minDataAccurate}, 模糊: ${systemState.minDataFuzzy}`,
	)
}

const setAutoMinData = (options: {
	isOn: boolean
	mode?: "fast" | "stable"
	autoAccurate?: boolean
	autoFuzzy?: boolean
}) => {
	systemState.isSetAutoMinData = options.isOn
	if (options.mode !== undefined) systemState.minDataMode = options.mode
	if (options.autoAccurate !== undefined)
		systemState.minDataAccurate = options.autoAccurate
	if (options.autoFuzzy !== undefined)
		systemState.minDataFuzzy = options.autoFuzzy

	logger.info(
		`[min-data] 自动更新: ${systemState.isSetAutoMinData}, 模式: ${systemState.minDataMode}`,
	)

	if (!options.isOn) {
		cancelMinDataScheduler()
		return
	}

	setupMinDataScheduler()
}

export {
	setAutoUpdate,
	setAutoTrading,
	setAutoMinData,
	setupScheduler,
	systemState,
}
