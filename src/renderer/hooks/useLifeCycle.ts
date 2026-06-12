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
	POS_MGMT_STRATEGY_CONFIG,
	SELECT_STOCK_STRATEGY_CONFIG,
	isWindows,
} from "@/renderer/constant"
import { useConfig } from "@/renderer/hooks/useConfig"
import { useHandleTimeTask } from "@/renderer/hooks/useHandleTimeTask"
import { useMinDataSchedule } from "@/renderer/hooks/useMinDataSchedule"
import { useToggleAutoRealTrading } from "@/renderer/hooks/useToggleAutoRealTrading"

import {
	isFullscreenAtom,
	isUpdatingAtom,
	loadingAnimeAtom,
} from "@/renderer/store"
import {
	accountKeyAtom,
	backtestConfigAtom,
	configHydratedAtom,
	isAutoLoginAtom,
	libraryTypeAtom,
	reTimingAtom,
	realMarketConfigSchemaAtom,
} from "@/renderer/store/storage"
import { LIBRARY_TYPE } from "@/shared/constants"
import { decodeToUi } from "@/shared/lib/real-market-config-codec"
import { macAddressAtom } from "@/renderer/store/user"
import { useLocalVersions, versionsEffectAtom } from "@/renderer/store/versions"
import type { PowerStatus } from "@/shared/types"
import { useMemoizedFn, useMount, useUnmount, useUpdateEffect } from "etc-hooks"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useRef } from "react"
import { toast } from "sonner"
import { useAppVersions } from "./useAppVersion"
import { useFusionManager } from "./useFusionManager"
import { useSettings } from "./useSettings"
import { useStrategyManager } from "./useStrategyManager"
import { useUserInfoSync } from "./useUserInfoSync"
const {
	fetchFullscreenState,
	subscribeScheduleStatus,
	// checkDBFile,
	getMacAddress,
	setAutoLaunch,
	getStoreValue,
	setStoreValue,
	// deleteStoreValue,
} = window.electronAPI

/**
 * -- 生命周期管理 Hook
 * -- 负责处理应用的初始化、状态管理和清理
 */
export const useLifeCycle = () => {
	// -- 状态管理
	const [config] = useConfig()
	const { refetchLocalVersions } = useLocalVersions()
	const isUpdating = useAtomValue(isUpdatingAtom)
	const isAutoLogin = useAtomValue(isAutoLoginAtom)
	useAtom(versionsEffectAtom) // -- 监听版本更新
	useAppVersions() // -- 检查远程版本
	useSettings() // -- 监听设置更新

	// -- 自定义 Hooks
	useUserInfoSync() // -- 同步用户信息，一分钟轮询一次
	const { syncSelectStgList } = useStrategyManager()
	const { syncFusion } = useFusionManager()
	const { handleToggleAutoRocket } = useToggleAutoRealTrading()
	const { startMinDataSchedule } = useMinDataSchedule()
	// const { mutateAsync } = useExtraWorkStatus()
	const handleTimeTask = useHandleTimeTask()

	// -- Setters
	const setters = {
		setLibraryType: useSetAtom(libraryTypeAtom),
		// setExtraWorkStatus: useSetAtom(extraWorkStatusAtom),
		setMacAddress: useSetAtom(macAddressAtom),
		setLoading: useSetAtom(loadingAnimeAtom),
		setIsFullscreen: useSetAtom(isFullscreenAtom),
		setAccountKey: useSetAtom(accountKeyAtom),
		setRealMarketConfig: useSetAtom(realMarketConfigSchemaAtom),
		setConfigHydrated: useSetAtom(configHydratedAtom),
		setBacktestConfig: useSetAtom(backtestConfigAtom),
		setReTiming: useSetAtom(reTimingAtom),
	}

	// -- 用于保存休眠前的更新状态（ref 跨渲染存活；首个 suspend 取胜，resume 消费后清空）
	const isUpdatingBeforeSuspendRef = useRef<boolean | null>(null)
	// -- IPC 反向推送的作用域退订集合（useMount 订阅、useUnmount drain，只清自己不殃及其他订阅者）
	const ipcUnsubscribesRef = useRef<Array<() => void>>([])
	// useMarketDataManager() // -- 使用实时市场数据管理的自定义 Hook
	/**
	 * -- 初始化定时任务
	 */
	const initScheduleTask = async () => {
		// -- S2a：从 config.json（real_market_config 唯一权威源）全量水合 UI 投影 atom。
		// -- decodeToUi 统一补齐 use_fuzzy/use_open_sell/reverse_repo_keep（闭合历史水合遗漏）
		// -- 与 filter bool→"0"/"1"、date "YYYY-MM-DD"→Date 的解码；完成后置水合标志。
		const wire = await getStoreValue("real_market_config", {})
		if (isWindows) {
			setters.setRealMarketConfig(decodeToUi(wire))
		}
		setters.setConfigHydrated(true)
		// -- 清理历史 localStorage 平行源（已收敛到 config.json，移除残留避免误读）
		try {
			localStorage.removeItem("realMarketConfig")
			localStorage.removeItem("real_market_config")
		} catch {}
	}

	/**
	 * -- 初始化账户信息
	 */
	const initAccountInfo = async () => {
		const [apiKey, uuid, libraryType, macAddress] = await Promise.all([
			getStoreValue("settings.api_key", ""),
			getStoreValue("settings.hid", ""),
			getStoreValue(LIBRARY_TYPE, "select"),
			getMacAddress(),
		])

		void setters.setMacAddress((prevMacAddress) => {
			if (prevMacAddress !== macAddress) {
				toast.warning(
					"检测到信息变更，虽然右上角有头像，但是请重新登录以确保正常使用",
					{
						duration: 10000,
					},
				)
			}
			return macAddress
		})
		void setters.setAccountKey({
			apiKey: apiKey as string,
			uuid: uuid as string,
		})

		setters.setLibraryType(libraryType === "pos" ? "pos" : "select") // -- 设置策略库类型

		return { apiKey, uuid, libraryType, macAddress }
	}

	/**
	 * -- 初始化回测配置
	 */
	const initBacktestConfig = async (libraryType: string) => {
		const configKey =
			libraryType === "pos"
				? POS_MGMT_STRATEGY_CONFIG
				: SELECT_STOCK_STRATEGY_CONFIG

		const [initialCash, startDate, endDate, backtestName, reTiming] =
			await Promise.all([
				getStoreValue(`${configKey}.initial_cash`, 100000),
				getStoreValue(`${configKey}.start_date`, ""),
				getStoreValue(`${configKey}.end_date`, ""),
				getStoreValue(`${configKey}.backtest_name`, "默认策略"),
				getStoreValue(`${configKey}.re_timing`, null),
			])

		setters.setBacktestConfig((prev) => ({
			...prev,
			initial_cash: Number(initialCash),
			start_date: startDate
				? new Date(startDate)
				: new Date(new Date().setFullYear(new Date().getFullYear() - 10)),
			end_date: endDate ? new Date(endDate) : undefined,
			backtest_name: backtestName as string,
		}))

		// 初始化 re_timing
		setters.setReTiming(reTiming)
	}

	/**
	 * -- 处理电源状态变化
	 * -- useMemoizedFn：订阅引用稳定（一次订阅），每次调用读最新闭包——isUpdating 与
	 * -- handleTimeTask 内部的会员/账号/实盘状态均为当前值，消除首渲染陈旧闭包。
	 * -- 实盘安全关停不依赖本链路：Windows suspend 由 main 权威 fail-closed 兜底。
	 */
	const handlePowerStatusChange = useMemoizedFn((status: PowerStatus) => {
		if (status === "suspend") {
			// -- 连续 suspend 只记首次的睡前状态（首次处理后 isUpdating 已被置 false，后写会毁掉恢复判断）
			if (isUpdatingBeforeSuspendRef.current === null) {
				isUpdatingBeforeSuspendRef.current = isUpdating
			}
			void handleTimeTask(true)
		}
		if (status === "resume") {
			const wasUpdating = isUpdatingBeforeSuspendRef.current
			isUpdatingBeforeSuspendRef.current = null
			// -- 无配对 suspend 的 resume：不猜测睡前状态（原实现 !null 会误暂停）
			if (wasUpdating === null) return
			void handleTimeTask(!wasUpdating)
		}
	})

	const initAutoLauncher = async (apiKey: string, uuid: string) => {
		if (!apiKey || !uuid) return
		const [isAutoLaunchUpdate, isAutoLaunchRealTrading, isAutoLaunchMinData] =
			await Promise.all([
				getStoreValue("settings.is_auto_launch_update", false),
				getStoreValue("settings.is_auto_launch_real_trading", false),
				getStoreValue("settings.is_auto_launch_min_data", false),
			])

		if (isAutoLaunchUpdate) {
			await handleTimeTask(false, false)
		}

		if (isAutoLaunchMinData) {
			await startMinDataSchedule(false)
		}

		const shouldStartRocket =
			isAutoLaunchRealTrading && isAutoLaunchUpdate && isAutoLaunchMinData

		// -- 实际是否开启自动实盘以 main 权威 ack 为准（失败不在下方误报「自动实盘」）
		let rocketStarted = false
		if (shouldStartRocket) {
			rocketStarted = await handleToggleAutoRocket(true, false, true)
		} else {
			await handleToggleAutoRocket(false, false, true)
		}

		const parts: string[] = []
		if (isAutoLaunchUpdate) parts.push("自动更新历史数据")
		if (isAutoLaunchMinData) parts.push("自动更新实时数据")
		if (rocketStarted) parts.push("自动实盘")
		if (parts.length > 0) {
			toast.success(`已为您开启：${parts.join("、")}`)
		}
	}

	// -- 生命周期钩子
	useMount(async () => {
		// -- 订阅置于首个 await 之前：闭合 async mount 下 cleanup 先于 push 的泄漏竞态窗口
		// -- （回调为 useMemoizedFn/稳定引用，早到事件读取的是当前值，行为同 boot 期）
		ipcUnsubscribesRef.current.push(
			window.electronAPI.onPowerStatus(handlePowerStatusChange),
			subscribeScheduleStatus(
				(_event, status) => status === "done" && refetchLocalVersions(),
			),
		)

		// versionCheck.start()
		const [_, { apiKey, uuid, libraryType }] = await Promise.all([
			initScheduleTask(),
			initAccountInfo(),
		])

		// -- 初始化回测配置
		await initBacktestConfig(libraryType)

		// -- 初始化其他状态
		const initialFullscreenState = await fetchFullscreenState()
		setters.setIsFullscreen(initialFullscreenState)

		// -- 清理实时市场数据，这个虽然useMarket的过程中会清理，但是这里是为了保险起见，初始化时再清理一次
		// await cleanMarketData()
		// -- Q2：先同步当前库策略落盘，再 initAutoLauncher，确保 main 自动实盘自校验读到的不是空策略列表
		await Promise.all([syncSelectStgList(), syncFusion()])
		await initAutoLauncher(apiKey, uuid)
	})

	// -- 更新效果
	useUpdateEffect(() => {
		setAutoLaunch(isAutoLogin)
	}, [isAutoLogin])

	useUpdateEffect(() => {
		setStoreValue("config", config)
	}, [config])

	// -- 清理
	useUnmount(() => {
		for (const unsubscribe of ipcUnsubscribesRef.current.splice(0)) {
			unsubscribe()
		}
	})
}
