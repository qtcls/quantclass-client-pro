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
	rebTimeConfigAtom,
	selectStgDictAtom,
	selectStgListAtom,
	// stgSelectionAtom,
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
// import { userAtom } from "@/renderer/store/user"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useCallback } from "react"

export function useStgSync() {
	// const { user } = useAtomValue(userAtom)
	// const { membershipInfo = [], isMember = false } = user ?? {}
	const [selectStgList, setSelectStgList] = useAtom(selectStgListAtom)
	// const setStgSelection = useSetAtom(stgSelectionAtom)
	const setSelectStgDict = useSetAtom(selectStgDictAtom)
	const [fusion, setFusion] = useAtom(fusionAtom)
	const [rebTimeConfig, setRebTimeConfig] = useAtom(rebTimeConfigAtom)
	const libraryType = useAtomValue(libraryTypeAtom)
	const syncStrategies = async () => {
		// console.log(selectStgList)
		// -- 处理选股策略

		return updateStrategies(selectStgList)
	}

	const updateStrategies = useCallback(
		async (strategies: SelectStgType[]) => {
			setSelectStgList(strategies)
			if (libraryType !== "pos") {
				const { strategyDict, rebTimeConfig: newRebTimeConfig } =
					await saveStrategyList(strategies, rebTimeConfig)
				setSelectStgDict(strategyDict)
				setRebTimeConfig(newRebTimeConfig)
			}
			return strategies
		},
		[selectStgList, libraryType, rebTimeConfig, setRebTimeConfig],
	)

	const updatePos = useCallback(
		async (strategies: (SelectStgType | StgGroupType | PosStrategyType)[]) => {
			setFusion(strategies)
			if (libraryType === "pos") {
				const { strategyDict, rebTimeConfig: newRebTimeConfig } =
					await saveStrategyListFusion(strategies, rebTimeConfig)
				setSelectStgDict(strategyDict)
				setRebTimeConfig(newRebTimeConfig)
			}
			return strategies
		},
		[fusion, libraryType, rebTimeConfig, setRebTimeConfig],
	)

	const addPos = useCallback(
		async (strategies: (SelectStgType | StgGroupType | PosStrategyType)[]) => {
			setFusion([...fusion, ...strategies])
			if (libraryType === "pos") {
				const { strategyDict, rebTimeConfig: newRebTimeConfig } =
					await saveStrategyListFusion(strategies, rebTimeConfig)
				setSelectStgDict(strategyDict)
				setRebTimeConfig(newRebTimeConfig)
			}
			return strategies
		},
		[fusion, libraryType, rebTimeConfig, setRebTimeConfig],
	)
	return { syncStrategies, updateStrategies, updatePos, addPos }
}
