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
	selectStgListAtom,
	stgSelectionAtom,
} from "@/renderer/store/storage"
import { useAtom, useSetAtom } from "jotai"
import { RESET } from "jotai/utils"
import { useEffect } from "react"
import { toast } from "sonner"

export function useMigrateStrategyData() {
	const [selectStockStg, setSelectStockStg] = useAtom(selectStgListAtom)
	const strategySelection = useSetAtom(stgSelectionAtom)

	useEffect(() => {
		const needsMigration =
			(selectStockStg.length > 0 &&
				!("enable_real_market" in selectStockStg[0])) ||
			(selectStockStg.length > 0 &&
				!("enable_real_market" in selectStockStg[0]))

		if (needsMigration) {
			// -- 重置所有策略相关的数据
			setSelectStockStg(RESET)
			strategySelection(RESET)

			toast.info("检测到策略数据格式变更，已迁移相关数据，请重新选择实盘策略", {
				duration: 5000,
			})
		}
	}, [])
}
