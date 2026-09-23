/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { useFusionManager } from "@/renderer/hooks/useFusionManager"
import { useStrategyManager } from "@/renderer/hooks/useStrategyManager"
import { userAtom } from "@/renderer/store/user"
import type { BasicStgType, SelectStgType } from "@/renderer/types/strategy"
import { checkPermission } from "@/shared/lib/permission"
import { useAtomValue } from "jotai"
import { toast } from "sonner"

/**
 * 示例：如何在组件中使用策略管理 hooks
 */
export function useStrategyExample() {
	const { permissions } = useAtomValue(userAtom)
	const isMember = checkPermission(permissions, "isMember")

	const {
		selectStgList,
		updateSelectStgList,
		addSelectStgList,
		removeSelectStg,
		updateSelectStg,
		resetSelectStgList,
		syncSelectStgList,
	} = useStrategyManager()

	const {
		fusion,
		updateFusion,
		addFusionStrategies,
		removeFusionStrategy,
		updateFusionStgInRow,
		resetFusion,
		syncFusion,
	} = useFusionManager()

	const handleAddSelectStrategy = async (strategy: BasicStgType) => {
		try {
			await addSelectStgList([strategy])
		} catch {
			toast.error("写入策略失败")
		}
	}

	const handleRemoveFusionStrategy = async (index: number) => {
		try {
			await removeFusionStrategy(index)
		} catch {
			toast.error("删除失败")
		}
	}

	const handleUpdateFusionStrategy = async (
		fusionIndex: number,
		values: any,
		strategy: SelectStgType,
		rowIndex: number,
	) => {
		try {
			await updateFusionStgInRow(fusionIndex, values, strategy, rowIndex)
		} catch {
			toast.error("保存策略失败")
		}
	}

	const handleResetAll = async () => {
		try {
			if (isMember) {
				await resetFusion()
			} else {
				await resetSelectStgList()
			}
		} catch {
			toast.error("清空失败")
		}
	}

	return {
		fusion,
		selectStgList,
		isMember,
		handleAddSelectStrategy,
		handleRemoveFusionStrategy,
		handleUpdateFusionStrategy,
		handleResetAll,
		updateFusion,
		addFusionStrategies,
		removeFusionStrategy,
		updateFusionStgInRow,
		resetFusion,
		syncFusion,
		updateSelectStgList,
		addSelectStgList,
		removeSelectStg,
		updateSelectStg,
		resetSelectStgList,
		syncSelectStgList,
	}
}
