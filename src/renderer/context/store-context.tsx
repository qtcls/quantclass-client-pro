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
	selectStgListAtom,
} from "@/renderer/store/storage"
import { userAtom } from "@/renderer/store/user"
import type {
	PosStrategyType,
	RebTimeConfig,
	SelectStgType,
	StgGroupType,
} from "@/renderer/types/strategy"
import {
	saveStockQuantStrategies,
	saveStrategyList,
	saveStrategyListFusion,
} from "@/renderer/utils/strategy"
import { checkPermission } from "@/shared/lib/permission"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useAtomCallback } from "jotai/utils"
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from "react"
import { autoInitAtoms } from "../store/electron"
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
	const [rebTimeConfig, setRebTimeConfig] = useAtom(rebTimeConfigAtom)
	const libraryType = useAtomValue(libraryTypeAtom)
	const { permissions } = useAtomValue(userAtom)
	const isMember = checkPermission(permissions, "isMember")
	const setReTiming = useSetAtom(reTimingAtom)
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const { setStoreValue } = window.electronAPI

	/**
	 * 初始化各种electron-store
	 */
	for (const _atom of autoInitAtoms) {
		useElectronStoreInit(_atom as any)
	}

	// 仅跟踪当前启用库对应的列表，避免无关列表变化也触发 effect
	const relevantList = libraryType === "pos" ? fusion : selectStgList

	// Fusion 相关方法
	const resetFusion = useCallback(() => {
		setFusion([])
		return []
	}, [setFusion])

	const syncFusion = useAtomCallback(async (get, set) => {
		const currentFusion = get(fusionAtom)
		const currentRebTimeConfig = get(rebTimeConfigAtom)
		const { rebTimeConfig: newRebTimeConfig } = await saveStrategyListFusion(
			currentFusion,
			currentRebTimeConfig,
		)
		set(rebTimeConfigAtom, newRebTimeConfig)
	})

	// SelectStgList 相关方法
	const resetSelectStgList = useCallback(() => {
		setSelectStgList([])
		if (libraryType !== "pos") {
			setReTiming(null)
			setStoreValue("select_stock.re_timing", null)
		}
		return []
	}, [setSelectStgList, libraryType, setReTiming, setStoreValue])

	const syncSelectStgList = useAtomCallback(async (get, set) => {
		const currentSelectStgList = get(selectStgListAtom)
		const currentRebTimeConfig = get(rebTimeConfigAtom)
		const { permissions } = get(userAtom)
		const persist = checkPermission(permissions, "isMember")
			? saveStrategyList
			: saveStockQuantStrategies
		const { rebTimeConfig: newRebTimeConfig } = await persist(
			currentSelectStgList,
			currentRebTimeConfig,
		)
		set(rebTimeConfigAtom, newRebTimeConfig)
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
				let newRebTimeConfig: Record<string, RebTimeConfig> = {}

				switch (libraryType) {
					case "pos": {
						const result = await saveStrategyListFusion(fusion, rebTimeConfig)
						newRebTimeConfig = result.rebTimeConfig
						break
					}
					case "select": {
						const persist = isMember
							? saveStrategyList
							: saveStockQuantStrategies
						const result = await persist(selectStgList, rebTimeConfig)
						newRebTimeConfig = result.rebTimeConfig
						break
					}
					default:
						break
				}

				setRebTimeConfig(newRebTimeConfig)
			}

			await saveData()
		}, 300) // 300ms 防抖延迟
		// 清理函数
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current)
			}
		}
	}, [relevantList, libraryType, isMember, setRebTimeConfig])

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
