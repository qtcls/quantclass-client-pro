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
	selectStgDictAtom,
	selectStgListAtom,
} from "@/renderer/store/storage"
import type {
	PosStrategyType,
	SelectStgType,
	StgGroupType,
} from "@/renderer/types/strategy"
import {
	saveStrategyList,
	saveStrategyListFusion,
} from "@/renderer/utils/strategy"
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

	// 同步方法
	syncFusion: () => Promise<void>
	syncSelectStgList: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
	const [fusion, setFusion] = useAtom(fusionAtom)
	const [selectStgList, setSelectStgList] = useAtom(selectStgListAtom)
	const libraryType = useAtomValue(libraryTypeAtom)
	const setSelectStgDict = useSetAtom(selectStgDictAtom)
	const setReTiming = useSetAtom(reTimingAtom)
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null) // 防抖时间控制器
	const {
		clearRealMarketData,
		saveRealMarketData,
		cleanRealMarketData,
		setStoreValue,
	} = window.electronAPI

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

	const syncFusion = useAtomCallback(async (get, set) => {
		const currentFusion = get(fusionAtom)
		const fusionDict = await saveStrategyListFusion(currentFusion)
		set(selectStgDictAtom, fusionDict)
	})

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

	const syncSelectStgList = useAtomCallback(async (get, set) => {
		const currentSelectStgList = get(selectStgListAtom)
		const selectStgDict = await saveStrategyList(currentSelectStgList)
		set(selectStgDictAtom, selectStgDict)
	})

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
			const saveData = async () => {
				let selectStgDict = {}
				switch (libraryType) {
					case "pos":
						selectStgDict = await saveStrategyListFusion(fusion)
						break
					case "select":
						selectStgDict = await saveStrategyList(selectStgList)
						break
					default:
						break
				}
				setSelectStgDict(selectStgDict)
				// 修正：确保 selectStgDict 是对象，且避免类型报错，使用 Object.keys
				const parsedData: Record<string, any> = {}
				Object.entries({
					...(selectStgDict ?? {}),
					非策略选股: NON_STRATEGY_CONFIG,
				}).forEach(([key, value], index) => {
					parsedData[`strategy_${index}`] = { ...(value ?? {}), name: key }
				})
				const strategyKeys = Object.keys(parsedData)
				await cleanRealMarketData(strategyKeys)
				await saveRealMarketData(parsedData)
				console.log(libraryType, selectStgDict, parsedData)
			}
			await saveData()
		}, 300) // 300ms 防抖延迟

		// 清理函数
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current)
			}
		}
	}, [relevantList, libraryType, setSelectStgDict])

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
		}),
		[
			fusion,
			selectStgList,
			libraryType,
			setFusion,
			setSelectStgList,
			resetFusion,
			resetSelectStgList,
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
