/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { isWindows } from "@/renderer/constant"
import { useConfig } from "@/renderer/hooks/useConfig"
import { useHandleTimeTask } from "@/renderer/hooks/useHandleTimeTask"
import { useToggleAutoRealTrading } from "@/renderer/hooks/useToggleAutoRealTrading"
import { onPowerStatus, unPowerStatusListener } from "@/renderer/ipc/listener"

import {
	isFullscreenAtom,
	isUpdatingAtom,
	loadingAnimeAtom,
} from "@/renderer/store"
import {
	accountKeyAtom,
	isAutoLoginAtom,
	libraryTypeAtom,
	realMarketConfigSchemaAtom,
} from "@/renderer/store/storage"
import { macAddressAtom } from "@/renderer/store/user"
import { useLocalVersions, versionsEffectAtom } from "@/renderer/store/versions"
import { useMount, useUnmount, useUpdateEffect } from "etc-hooks"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { toast } from "sonner"
import { syncUserState } from "../ipc/userInfo"
import { useAppVersions } from "./useAppVersion"
import { useFusionManager } from "./useFusionManager"
import { useSettings } from "./useSettings"
import { useStrategyManager } from "./useStrategyManager"
import { useUserInfoSync } from "./useUserInfoSync"
const {
	fetchFullscreenState,
	subscribePowerMonitor,
	subscribeScheduleStatus,
	removeReportErrorListener,
	unSubscribeSendScheduleStatusListener,
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
	const { settings } = useSettings()
	useAtom(versionsEffectAtom) // -- 监听版本更新
	useAppVersions() // -- 检查远程版本

	// -- 自定义 Hooks
	const { user, isLoggedIn } = useUserInfoSync()
	const { syncSelectStgList } = useStrategyManager()
	const { syncFusion } = useFusionManager()
	const { handleToggleAutoRocket } = useToggleAutoRealTrading()
	// const { mutateAsync } = useExtraWorkStatus()
	const handleTimeTask = useHandleTimeTask()

	// -- Setters
	const setters = {
		// setExtraWorkStatus: useSetAtom(extraWorkStatusAtom),
		setMacAddress: useSetAtom(macAddressAtom),
		setLoading: useSetAtom(loadingAnimeAtom),
		setIsFullscreen: useSetAtom(isFullscreenAtom),
		setAccountKey: useSetAtom(accountKeyAtom),
		setRealMarketConfig: useSetAtom(realMarketConfigSchemaAtom),
		setLibraryType: useSetAtom(libraryTypeAtom),
	}

	// -- 用于保存休眠前的更新状态
	let isUpdatingBeforeSuspend: boolean | null = null
	// useMarketDataManager() // -- 使用实时市场数据管理的自定义 Hook
	/**
	 * -- 初始化定时任务
	 */
	const initScheduleTask = async () => {
		const realMarketConfig = await getStoreValue("real_market_config", {
			filter_kcb: true,
			filter_cyb: true,
			filter_bj: true,
			qmt_path: "",
			account_id: "",
			qmt_port: "58610",
			message_robot_url: "",
			performance_mode: "EQUAL",
			date_start: new Date(
				new Date().setFullYear(new Date().getFullYear() - 3),
			),
		})

		if (realMarketConfig && isWindows) {
			setters.setRealMarketConfig((prevConfig) => ({
				...prevConfig,
				date_start:
					realMarketConfig.date_start &&
					typeof realMarketConfig.date_start === "string"
						? new Date(realMarketConfig.date_start as string)
						: new Date(new Date().setFullYear(new Date().getFullYear() - 3)),
				filter_kcb: realMarketConfig.filter_kcb ? "1" : "0",
				filter_cyb: realMarketConfig?.filter_cyb ? "1" : "0",
				filter_bj: realMarketConfig?.filter_bj ? "1" : "0",
				qmt_path: realMarketConfig?.qmt_path ?? "",
				account_id: realMarketConfig?.account_id ?? "",
				qmt_port: realMarketConfig?.qmt_port ?? "58610",
				message_robot_url: realMarketConfig?.message_robot_url ?? "",
				performance_mode: (realMarketConfig.performance_mode || "EQUAL") as
					| "EQUAL"
					| "PERFORMANCE"
					| "ECONOMY",
			}))
		}
	}

	/**
	 * -- 初始化账户信息
	 */
	const initAccountInfo = async () => {
		const macAddress = await getMacAddress()

		setters.setMacAddress((prevMacAddress) => {
			if (prevMacAddress !== macAddress) {
				toast.warning("检测到设备地址变更，请稍后重新登录")
			}
			return macAddress
		})
		setters.setAccountKey({
			apiKey: settings.api_key,
			uuid: settings.hid,
		})

		// if (isLoggedIn && user?.apiKey && user?.uuid) {
		// 	const { data } = await mutateAsync({
		// 		apiKey: user.apiKey,
		// 		uuid: user.uuid,
		// 	})
		// 	setters.setExtraWorkStatus(data)
		// }
	}

	/**
	 * -- 处理电源状态变化
	 */
	const handlePowerStatusChange = (status: string) => {
		if (status === "suspend") {
			isUpdatingBeforeSuspend = isUpdating
			handleTimeTask(true)
		}
		if (status === "resume") {
			handleTimeTask(!isUpdatingBeforeSuspend)
		}
	}

	const initAutoLauncher = async () => {
		if (settings.is_auto_launch_update) {
			await handleTimeTask(false, false)
			toast.success("已为您开启自动更新数据")
		}
		if (
			settings.is_auto_launch_update &&
			settings.is_auto_launch_real_trading
		) {
			await handleToggleAutoRocket(true, false, true)
			toast.success("已为您开启自动实盘和自动更新数据")
		} else {
			await handleToggleAutoRocket(false, false, true)
		}
	}

	// -- 生命周期钩子
	useMount(async () => {
		// versionCheck.start()
		setters.setLibraryType(settings.libraryType || "select")

		await Promise.all([initScheduleTask(), initAccountInfo()])

		// -- 初始化监听器
		onPowerStatus(handlePowerStatusChange)
		subscribePowerMonitor((_event, status) => handlePowerStatusChange(status))
		subscribeScheduleStatus(
			(_event, status) => status === "done" && refetchLocalVersions(),
		)

		// -- 初始化其他状态
		const initialFullscreenState = await fetchFullscreenState()
		setters.setIsFullscreen(initialFullscreenState)

		// -- 同步用户状态并处理自动启动
		await syncUserState({
			user: {
				id: user?.id ?? "",
				uuid: user?.uuid ?? "",
				apiKey: user?.apiKey ?? "",
				headimgurl: user?.headimgurl ?? "",
				isMember: user?.isMember ?? false,
				nickname: user?.nickname ?? "",
				approval: user?.approval ?? {
					block: false,
					crypto: false,
					stock: false,
				},
				membershipInfo: user?.membershipInfo ?? [],
				groupInfo: user?.groupInfo ?? [],
			},
			isLoggedIn,
		})

		// -- 清理实时市场数据，这个虽然useMarket的过程中会清理，但是这里是为了保险起见，初始化时再清理一次
		// await cleanMarketData()
		await Promise.all([syncSelectStgList(), syncFusion(), initAutoLauncher()])
	})

	// -- 更新效果
	useUpdateEffect(() => {
		setAutoLaunch(isAutoLogin)
	}, [isAutoLogin])

	useUpdateEffect(() => {
		setStoreValue("config", config)
	}, [config])

	// -- 清理
	useUnmount(async () => {
		unSubscribeSendScheduleStatusListener()
		removeReportErrorListener()
		unPowerStatusListener()
	})
}
