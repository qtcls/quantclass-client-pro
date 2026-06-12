/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { useStore } from "@/renderer/context/store-context"
import {
	isAutoRocketAtom,
	isMinDataUpdatingAtom,
	isUpdatingAtom,
} from "@/renderer/store"
import {
	fusionAtom,
	libraryTypeAtom,
	selectStgListAtom,
} from "@/renderer/store/storage"
import {
	type TradingGuardCode,
	validateTradingPreconditions,
} from "@/shared/lib/trading-guard"
import dayjs from "dayjs"
import { useAtom, useAtomValue } from "jotai"
import { useAtomCallback } from "jotai/utils"
import { useCallback } from "react"
import { toast } from "sonner"

// -- 前置守卫失败码 → 用户提示（沿用既有文案）
const GUARD_TOAST: Record<Exclude<TradingGuardCode, "ok">, string> = {
	no_strategy: "请先导入策略，再分配权重",
	zero_weight: "所有策略权重为 0，请先分配权重",
	data_not_updating: "请在首页，先启动自动更新历史数据和实时数据",
	qmt_not_configured: "请在实盘配置中完善 QMT 配置",
}

// -- 稳定的桥方法在模块级解构（与 useLifeCycle/realtime-data 一致），避免进入 hook 依赖
const { setAutoTrading, getStoreValue, setStoreValue, killRocket } =
	window.electronAPI

export const useToggleAutoRealTrading = () => {
	const isUpdating = useAtomValue(isUpdatingAtom) // -- 历史数据是否自动更新
	const isMinDataUpdating = useAtomValue(isMinDataUpdatingAtom) // -- 实时数据是否自动更新
	const [isAutoRocket, setIsAutoRocket] = useAtom(isAutoRocketAtom) // -- 是否自动实盘
	const { syncSelectStgList, syncFusion, flushRealMarketData } = useStore()

	// -- S2b：enable 时一次性读 fresh libraryType + 对应库策略，消除 boot useMount 首渲染闭包 stale
	// -- （libraryTypeAtom 首渲染读 localStorage，可与 initAccountInfo 写入的 settings.libraryType 分叉）。
	const readEnableSnapshot = useAtomCallback(
		useCallback((get) => {
			const lib = get(libraryTypeAtom)
			return {
				libraryType: lib,
				strategies: lib === "pos" ? get(fusionAtom) : get(selectStgListAtom),
			}
		}, []),
	)

	/**
	 * @description 切换自动实盘
	 * @returns 是否成功（主进程权威 ack.ok）
	 */
	const handleToggleAutoRocket = useCallback(
		async (
			enable: boolean,
			showToast = true,
			ignoreUpdateCheck = false,
		): Promise<boolean> => {
			const wasAutoRocket = isAutoRocket // -- 调用前快照，用于 toast 抑制判断

			if (enable) {
				// -- S2b：fresh 快照（守卫与 sync 选择都基于它，不用可能 stale 的闭包；尤其 boot 路径）
				const { libraryType: freshLib, strategies: freshStrategies } =
					readEnableSnapshot()

				// -- 前置校验（与 main cron / setAutoTrading 同源 predicate）
				const realMarketConfig = (await getStoreValue(
					"real_market_config",
				)) as Record<string, unknown>
				const result = validateTradingPreconditions({
					strategies: freshStrategies,
					realMarketConfig,
					isUpdating,
					isMinDataUpdating,
					requireDataUpdating: !ignoreUpdateCheck,
				})
				if (!result.ok) {
					showToast &&
						toast.warning(
							GUARD_TOAST[result.code as Exclude<TradingGuardCode, "ok">],
						)
					return false
				}

				// -- F5：校验通过后把当前库策略 flush 落盘到 config.json，确保 main 自校验读到最新（消除 300ms 防抖竞态）
				let strategyDict: Record<string, any>
				try {
					strategyDict = await (freshLib === "pos"
						? syncFusion()
						: syncSelectStgList())
				} catch (error) {
					// -- fail-closed：flush 失败则无法保证 main 读到最新策略 → 取消开启，绝不进入 setAutoTrading(true)
					console.error("[trade] flush 策略到 store 失败，取消开启自动实盘", error)
					showToast && toast.error("策略保存失败，已取消开启自动实盘，请重试")
					return false
				}

				// -- S2b：setAutoTrading 前确定性落盘 real_market_25.json（内核经 ROCKET_STR_INFO_PATH 读此文件下单），
				// -- 消除用 stale/未落盘配置启动 rocket 的窗口；落盘失败 fail-closed 取消开启（复用 F5 模式）
				const rmAck = await flushRealMarketData(strategyDict)
				if (!rmAck.ok) {
					console.error(
						"[trade] real_market_25.json 落盘失败，取消开启自动实盘",
						rmAck.error,
					)
					showToast &&
						toast.error("实盘策略保存失败，已取消开启自动实盘，请重试")
					return false
				}
			}

			// -- await 主进程权威 ack
			const ack = await setAutoTrading(enable)
			const enabled = ack?.ok ? !!ack.isSetAutoTrading : false // -- 失败偏 OFF（INV3/INV10）
			setIsAutoRocket(enabled)
			setStoreValue(
				"last_heartbeat_time",
				enabled ? dayjs().format("HH:mm") : null,
			)
			// -- 保留 renderer killRocket 作幂等保险（Q4）；main 已权威强杀
			!enable && (await killRocket())

			if (showToast) {
				if (enable && !enabled) {
					toast.error("自动实盘开启失败，请重试或检查配置")
				} else if (enable !== wasAutoRocket) {
					if (!enable && ack?.ok === false) {
						toast.warning("已关闭自动实盘，但未能确认进程已终止，请稍后检查")
					} else {
						toast.success(
							enable && ignoreUpdateCheck
								? "自动更新数据和自动实盘已开启"
								: enable
									? "自动实盘已开启"
									: "已关闭自动实盘且终止相关进程",
						)
					}
				}
			}

			return ack?.ok ?? false
		},
		[
			isAutoRocket,
			isUpdating,
			isMinDataUpdating,
			readEnableSnapshot,
			syncSelectStgList,
			syncFusion,
			flushRealMarketData,
			setIsAutoRocket,
		],
	)

	return {
		isAutoRocket,
		handleToggleAutoRocket,
	}
}
