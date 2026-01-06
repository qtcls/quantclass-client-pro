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
import type { SelectStgType } from "@/renderer/types/strategy"
import { useCallback } from "react"

export function useStrategyManager() {
	const {
		selectStgList,
		setSelectStgList,
		syncSelectStgList,
		resetSelectStgList,
	} = useStore()

	const updateSelectStgList = useCallback(
		(strategies: SelectStgType[]) => {
			setSelectStgList(strategies)
			return strategies
		},
		[setSelectStgList],
	)

	const addSelectStgList = useCallback(
		(strategies: SelectStgType[]) => {
			setSelectStgList([...selectStgList, ...strategies])
			return strategies
		},
		[selectStgList, setSelectStgList],
	)

	const removeSelectStg = useCallback(
		(strategyIndex: number) => {
			setSelectStgList([
				...selectStgList.slice(0, strategyIndex),
				...selectStgList.slice(strategyIndex + 1),
			])
			return 1
		},
		[selectStgList, setSelectStgList],
	)

	const updateSelectStg = useCallback(
		(strategyIndex: number, strategy: SelectStgType) => {
			setSelectStgList([
				...selectStgList.slice(0, strategyIndex),
				strategy,
				...selectStgList.slice(strategyIndex + 1),
			])
			return 1
		},
		[selectStgList, setSelectStgList],
	)

	return {
		// -- 选股策略列表
		selectStgList,

		// -- 更新选股策略列表
		syncSelectStgList,
		updateSelectStgList,
		addSelectStgList,
		removeSelectStg,
		updateSelectStg,
		resetSelectStgList,
	}
}
