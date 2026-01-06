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
import { useCallback } from "react"
import type {
	PosStrategyType,
	SelectStgType,
	StgGroupType,
} from "../types/strategy"

export function useFusionManager() {
	const { fusion, setFusion, resetFusion, syncFusion } = useStore()

	// Fusion 相关方法
	const updateFusion = useCallback(
		(strategies: (SelectStgType | StgGroupType | PosStrategyType)[]) => {
			setFusion(strategies)
			return strategies
		},
		[setFusion],
	)

	const addFusionStrategies = useCallback(
		(strategies: (SelectStgType | StgGroupType | PosStrategyType)[]) => {
			setFusion([...fusion, ...strategies])
		},
		[fusion, setFusion],
	)

	const removeFusionStrategy = useCallback(
		(fusionStrategyIndex: number) => {
			setFusion([
				...fusion.slice(0, fusionStrategyIndex),
				...fusion.slice(fusionStrategyIndex + 1),
			])
			return 1
		},
		[fusion, setFusion],
	)

	const updateFusionStgInRow = useCallback(
		(
			fusionIndex: number,
			values: any,
			strategy: SelectStgType,
			rowIndex: number,
		) => {
			const stgInFusion = fusion[fusionIndex]
			if (!stgInFusion) return null

			// 解析值，有一些字段需要预解析
			const parsedValues = { ...values }
			if (values.offset_list) {
				parsedValues.offset_list = values.offset_list.split(",").map(Number)
			}
			if (values.rebalance_time) {
				parsedValues.rebalance_time = values.rebalance_time
			}

			// 确保 cap_weight 被正确处理，避免从 0 变成 1
			const updatedStrategy = {
				...strategy,
				...parsedValues,
			} as SelectStgType

			let newStg: SelectStgType | StgGroupType | PosStrategyType

			switch (stgInFusion.type) {
				case "group": {
					newStg = {
						...stgInFusion,
						strategy_list: [
							...stgInFusion.strategy_list.slice(0, rowIndex),
							updatedStrategy,
							...stgInFusion.strategy_list.slice(rowIndex + 1),
						],
					} as StgGroupType
					break
				}
				case "pos":
					newStg = {
						...stgInFusion,
						strategy_pool: [
							...stgInFusion.strategy_pool.slice(0, rowIndex),
							updatedStrategy,
							...stgInFusion.strategy_pool.slice(rowIndex + 1),
						],
					} as PosStrategyType
					break
				default:
					newStg = updatedStrategy
					break
			}

			// 更新 fusion 状态
			const newFusion = [
				...fusion.slice(0, fusionIndex),
				newStg,
				...fusion.slice(fusionIndex + 1),
			]

			setFusion(newFusion)
			return newStg
		},
		[fusion, setFusion],
	)

	return {
		// 状态
		fusion,

		// Fusion 操作
		updateFusion, // 更新Fusion策略列表
		addFusionStrategies, // 添加Fusion策略
		removeFusionStrategy, // 删除Fusion策略
		updateFusionStgInRow, // 更新Fusion策略中的单个策略
		resetFusion, // 重置Fusion策略列表
		syncFusion, // 同步Fusion策略列表
	}
}
