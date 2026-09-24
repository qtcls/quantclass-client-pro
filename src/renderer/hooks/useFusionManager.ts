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
	rebTimeConfigAtom,
	strategyRuntimeConfigAtom,
} from "@/renderer/store/storage"
import type {
	PosStrategyType,
	SelectStgType,
	StgGroupType,
} from "../types/strategy"
import { saveStrategyListFusion } from "@/renderer/utils/strategy"
import { useAtom } from "jotai"
import { useAtomCallback } from "jotai/utils"
import { useCallback } from "react"

type FusionStrategy = SelectStgType | StgGroupType | PosStrategyType

export function useFusionManager() {
	const [fusion, setFusion] = useAtom(fusionAtom)
	const [rebTimeConfig, setRebTimeConfig] = useAtom(rebTimeConfigAtom)
	const [runtimeConfig, setRuntimeConfig] = useAtom(strategyRuntimeConfigAtom)

	const persistFusion = useCallback(
		async (strategies: FusionStrategy[]) => {
			const {
				rebTimeConfig: newRebTimeConfig,
				strategyRuntimeConfig: newRuntimeConfig,
			} = await saveStrategyListFusion(
				strategies,
				rebTimeConfig,
				runtimeConfig,
			)
			setRebTimeConfig(newRebTimeConfig)
			setRuntimeConfig(newRuntimeConfig)
		},
		[rebTimeConfig, runtimeConfig, setRebTimeConfig, setRuntimeConfig],
	)

	const resetFusion = useCallback(async () => {
		setFusion([])
		await persistFusion([])
		return []
	}, [setFusion, persistFusion])

	const syncFusion = useAtomCallback(async (get, set) => {
		const currentFusion = get(fusionAtom)
		const currentRebTimeConfig = get(rebTimeConfigAtom)
		const currentRuntimeConfig = get(strategyRuntimeConfigAtom)
		const {
			rebTimeConfig: newRebTimeConfig,
			strategyRuntimeConfig: newRuntimeConfig,
		} = await saveStrategyListFusion(
			currentFusion,
			currentRebTimeConfig,
			currentRuntimeConfig,
		)
		set(rebTimeConfigAtom, newRebTimeConfig)
		set(strategyRuntimeConfigAtom, newRuntimeConfig)
	})

	const updateFusion = useCallback(
		async (strategies: FusionStrategy[]) => {
			setFusion(strategies)
			await persistFusion(strategies)
			return strategies
		},
		[setFusion, persistFusion],
	)

	const addFusionStrategies = useCallback(
		async (strategies: FusionStrategy[]) => {
			const newList = [...fusion, ...strategies]
			setFusion(newList)
			await persistFusion(newList)
		},
		[fusion, setFusion, persistFusion],
	)

	const removeFusionStrategy = useCallback(
		async (fusionStrategyIndex: number) => {
			const newList = [
				...fusion.slice(0, fusionStrategyIndex),
				...fusion.slice(fusionStrategyIndex + 1),
			]
			setFusion(newList)
			await persistFusion(newList)
			return 1
		},
		[fusion, setFusion, persistFusion],
	)

	const updateFusionStgInRow = useCallback(
		async (
			fusionIndex: number,
			values: any,
			strategy: SelectStgType,
			rowIndex: number,
		) => {
			const stgInFusion = fusion[fusionIndex]
			if (!stgInFusion) return null

			const parsedValues = { ...values }
			if (values.offset_list) {
				parsedValues.offset_list = values.offset_list.split(",").map(Number)
			}
			if (values.rebalance_time) {
				parsedValues.rebalance_time = values.rebalance_time
			}

			const updatedStrategy = {
				...strategy,
				...parsedValues,
			} as SelectStgType

			let newStg: FusionStrategy

			switch (stgInFusion.type) {
				case "group": {
					const group = stgInFusion as StgGroupType
					newStg = {
						...group,
						strategy_list: [
							...group.strategy_list.slice(0, rowIndex),
							updatedStrategy,
							...group.strategy_list.slice(rowIndex + 1),
						],
					}
					break
				}
				case "pos": {
					const pos = stgInFusion as PosStrategyType
					newStg = {
						...pos,
						strategy_pool: [
							...pos.strategy_pool.slice(0, rowIndex),
							updatedStrategy,
							...pos.strategy_pool.slice(rowIndex + 1),
						],
					} as PosStrategyType
					break
				}
				default:
					newStg = updatedStrategy
					break
			}

			const newFusion = [
				...fusion.slice(0, fusionIndex),
				newStg,
				...fusion.slice(fusionIndex + 1),
			]

			setFusion(newFusion)
			await persistFusion(newFusion)
			return newStg
		},
		[fusion, setFusion, persistFusion],
	)

	const updateFusionPosStrategy = useCallback(
		async (fusionIndex: number, partial: Partial<PosStrategyType>) => {
			const stg = fusion[fusionIndex]
			if (!stg || stg.type !== "pos") return null
			const updated = { ...stg, ...partial } as PosStrategyType
			const newFusion = [
				...fusion.slice(0, fusionIndex),
				updated,
				...fusion.slice(fusionIndex + 1),
			]
			setFusion(newFusion)
			await persistFusion(newFusion)
			return updated
		},
		[fusion, setFusion, persistFusion],
	)

	return {
		fusion,
		updateFusion,
		addFusionStrategies,
		removeFusionStrategy,
		updateFusionStgInRow,
		updateFusionPosStrategy,
		resetFusion,
		syncFusion,
	}
}
