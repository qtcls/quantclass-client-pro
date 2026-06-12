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
	fusionAtom,
	libraryTypeAtom,
	reTimingAtom,
	rebTimeConfigAtom,
	selectStgDictAtom,
	selectStgListAtom,
} from "@/renderer/store/storage"
import type {
	PosStrategyType,
	RebTimeConfig,
	SelectStgType,
	StgGroupType,
} from "@/renderer/types/strategy"
import {
	saveStrategyList,
	saveStrategyListFusion,
} from "@/renderer/utils/strategy"
import type { SaveRealMarketDataAck } from "@/shared/types/trading"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { RESET, useAtomCallback } from "jotai/utils"
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from "react"
import { autoInitAtoms } from "../store/electron"
import { generateNonStrategySelectStrategyConfig } from "../utils"
import { buildRealMarketData } from "../utils/real-market-data"
import { useElectronStoreInit } from "../utils/store"

interface StoreContextType {
	// 状态
	fusion: (SelectStgType | StgGroupType | PosStrategyType)[]
	selectStgList: SelectStgType[]

	// 设置方法
	setFusion: (
		strategies: (SelectStgType | StgGroupType | PosStrategyType)[],
	) => void
	setSelectStgList: (strategies: SelectStgType[]) => void
	libraryType: string

	// 重置方法
	resetFusion: () => (SelectStgType | StgGroupType | PosStrategyType)[]
	resetSelectStgList: () => SelectStgType[]

	// 同步方法（返回本次生成的 strategyDict，供 enable 确定性落盘 real_market_25.json）
	syncFusion: () => Promise<Record<string, any>>
	syncSelectStgList: () => Promise<Record<string, any>>

	// real_market_25.json 落盘（防抖与 enable 共用；capturedGen 用于 gen guard，见实现）
	flushRealMarketData: (
		strategyDict: Record<string, any>,
		capturedGen?: number,
	) => Promise<SaveRealMarketDataAck>
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
	const [fusion, setFusion] = useAtom(fusionAtom)
	const [selectStgList, setSelectStgList] = useAtom(selectStgListAtom)
	const [rebTimeConfig, setRebTimeConfig] = useAtom(rebTimeConfigAtom)
	const libraryType = useAtomValue(libraryTypeAtom)
	const setSelectStgDict = useSetAtom(selectStgDictAtom)
	const setReTiming = useSetAtom(reTimingAtom)
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null) // 防抖时间控制器
	// -- S2b：flush 代际。权威 enable flush 递增；被取代的 in-flight 防抖写前发现 gen 不一致即跳过（防 stale 覆盖）。
	const saveGenerationRef = useRef(0)
	// -- S2b：防抖读最新 rebTimeConfig（经 ref，不入 effect 依赖，避免 setRebTimeConfig 回写触发的死循环）。
	const rebTimeConfigRef = useRef(rebTimeConfig)
	const { clearRealMarketData, saveRealMarketData, setStoreValue } =
		window.electronAPI

	/**
	 * 初始化各种electron-store
	 */
	for (const _atom of autoInitAtoms) {
		useElectronStoreInit(_atom as any)
	}

	// 常量：非策略选股配置（避免在 effect 中重复计算）
	const NON_STRATEGY_CONFIG = useMemo(
		() =>
			generateNonStrategySelectStrategyConfig([
				"5_0",
				"5_1",
				"5_2",
				"5_3",
				"5_4",
				5,
			]),
		[],
	)

	// 仅跟踪当前启用库对应的列表，避免无关列表变化也触发 effect
	const relevantList = libraryType === "pos" ? fusion : selectStgList

	// Fusion 相关方法
	const resetFusion = useCallback(() => {
		setFusion([])
		if (libraryType === "pos") {
			setSelectStgDict(RESET)
			clearRealMarketData()
		}
		return []
	}, [setFusion, libraryType, setSelectStgDict])

	const syncFusion = useAtomCallback(
		// -- useCallback 稳定 callback 身份：useAtomCallback 按 [callback] 记忆，否则 syncFusion
		// -- 每渲染重建 → 破坏 contextValue / handleToggleAutoRocket 记忆化（额外重渲染）。
		useCallback(async (get, set) => {
			const currentFusion = get(fusionAtom)
			const currentRebTimeConfig = get(rebTimeConfigAtom)
			const { strategyDict, rebTimeConfig: newRebTimeConfig } =
				await saveStrategyListFusion(currentFusion, currentRebTimeConfig)
			set(selectStgDictAtom, strategyDict)
			set(rebTimeConfigAtom, newRebTimeConfig)
			// -- S2b：返回本次生成的 dict 供 enable 确定性落盘 real_market_25.json（无二次随机化）
			return strategyDict
		}, []),
	)

	// SelectStgList 相关方法
	const resetSelectStgList = useCallback(() => {
		setSelectStgList([])
		if (libraryType !== "pos") {
			setSelectStgDict(RESET)
			// 清除资金曲线再择时
			setReTiming(null)
			setStoreValue("select_stock.re_timing", null)
		}
		return []
	}, [
		setSelectStgList,
		libraryType,
		setSelectStgDict,
		setReTiming,
		setStoreValue,
	])

	const syncSelectStgList = useAtomCallback(
		// -- useCallback 稳定 callback 身份（理由同 syncFusion）。
		useCallback(async (get, set) => {
			const currentSelectStgList = get(selectStgListAtom)
			const currentRebTimeConfig = get(rebTimeConfigAtom)
			const { strategyDict, rebTimeConfig: newRebTimeConfig } =
				await saveStrategyList(currentSelectStgList, currentRebTimeConfig)
			set(selectStgDictAtom, strategyDict)
			set(rebTimeConfigAtom, newRebTimeConfig)
			// -- S2b：返回本次生成的 dict 供 enable 确定性落盘 real_market_25.json（无二次随机化）
			return strategyDict
		}, []),
	)

	/**
	 * S2b：real_market_25.json 落盘——防抖与 enable 共用的唯一确定性出口。
	 * - capturedGen===undefined → 权威 flush（enable）：递增代际取代任何 in-flight 防抖，并取消 pending 防抖。
	 * - capturedGen!==当前代际 → 该防抖已被更晚的权威 flush 取代 → 跳过写，避免 stale 覆盖。
	 * - 永不抛：任何异常转 {ok:false}，由调用方 fail-closed。
	 */
	const flushRealMarketData = useCallback(
		async (
			strategyDict: Record<string, any>,
			capturedGen?: number,
		): Promise<SaveRealMarketDataAck> => {
			try {
				if (capturedGen === undefined) {
					saveGenerationRef.current++
					if (saveTimeoutRef.current) {
						clearTimeout(saveTimeoutRef.current)
						saveTimeoutRef.current = null
					}
				} else if (capturedGen !== saveGenerationRef.current) {
					return { ok: true }
				}
				const parsedData = buildRealMarketData(strategyDict, NON_STRATEGY_CONFIG)
				return await saveRealMarketData(parsedData)
			} catch (error) {
				return { ok: false, reason: "exception", error: String(error) }
			}
		},
		[NON_STRATEGY_CONFIG],
	)

	// -- S2b：保持 rebTimeConfigRef 为最新（防抖读它而非闭包，消除 stale 而不入依赖 → 不死循环）
	useEffect(() => {
		rebTimeConfigRef.current = rebTimeConfig
	}, [rebTimeConfig])

	/**
	 * 自动监听和同步逻辑
	 */
	useEffect(() => {
		// 清除之前的定时器
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current)
		}

		// 设置防抖定时器
		saveTimeoutRef.current = setTimeout(async () => {
			// -- S2b：捕获 fire 时代际；写前若被更晚的权威 enable flush 取代则跳过（见 flushRealMarketData）
			const capturedGen = saveGenerationRef.current
			let selectStgDict: Record<string, any> = {}
			let newRebTimeConfig: Record<string, RebTimeConfig> = {}

			switch (libraryType) {
				case "pos": {
					// -- S2b：读 rebTimeConfigRef.current（最新换仓时间），消除闭包 stale
					const result = await saveStrategyListFusion(
						fusion,
						rebTimeConfigRef.current,
					)
					selectStgDict = result.strategyDict
					newRebTimeConfig = result.rebTimeConfig
					break
				}
				case "select": {
					const result = await saveStrategyList(
						selectStgList,
						rebTimeConfigRef.current,
					)
					selectStgDict = result.strategyDict
					newRebTimeConfig = result.rebTimeConfig
					break
				}
				default:
					break
			}

			setSelectStgDict(selectStgDict)
			setRebTimeConfig(newRebTimeConfig)
			// -- S2b：经共用确定性出口落盘 real_market_25.json（原子全量替换 + gen guard）
			await flushRealMarketData(selectStgDict, capturedGen)
		}, 300) // 300ms 防抖延迟

		// 清理函数
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current)
			}
		}
	}, [
		relevantList,
		libraryType,
		setSelectStgDict,
		setRebTimeConfig,
		flushRealMarketData,
	])

	const contextValue = useMemo(
		() => ({
			// 状态
			fusion,
			selectStgList,
			libraryType,

			// 设置方法
			setFusion,
			setSelectStgList,

			// 重置方法
			resetFusion,
			syncFusion,

			// 同步方法
			resetSelectStgList,
			syncSelectStgList,

			// real_market_25.json 落盘（S2b：防抖与 enable 共用）
			flushRealMarketData,
		}),
		[
			fusion,
			selectStgList,
			libraryType,
			setFusion,
			setSelectStgList,
			resetFusion,
			resetSelectStgList,
			syncFusion,
			syncSelectStgList,
			flushRealMarketData,
		],
	)

	return (
		<StoreContext.Provider value={contextValue}>
			{children}
		</StoreContext.Provider>
	)
}

export function useStore() {
	const context = useContext(StoreContext)
	if (!context) {
		throw new Error("useStore must be used within StoreProvider")
	}
	return context
}
