/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { DataTable } from "@/renderer/components/ui/data-table"
import { TradingPlanTableToolbar } from "@/renderer/page/trading/plan"
import { useBuyColumns } from "@/renderer/page/trading/plan/columns/buy-column"
import type { BuyRoot, BuyTableRef } from "@/renderer/page/trading/plan/types"
import { useQuery } from "@tanstack/react-query"
import { forwardRef, useImperativeHandle, useMemo } from "react"

export interface BuyTableProps {
	showOriginal: boolean
	showGeguZeshi: boolean
}

const BuyTable = forwardRef<BuyTableRef, BuyTableProps>(
	({ showOriginal, showGeguZeshi }, ref) => {
		const { getBuyInfoList, getBuyTimingInfoList } = window.electronAPI
		const columns = useBuyColumns()

		const { data: buyData, refetch: refetchBuy, isLoading: loadingBuy } = useQuery({
			queryKey: ["load-buy-info"],
			queryFn: () => getBuyInfoList(),
			refetchInterval: 45 * 1000,
		})

		const { data: timingData, refetch: refetchTiming, isLoading: loadingTiming } = useQuery({
			queryKey: ["load-buy-timing-info"],
			queryFn: () => getBuyTimingInfoList(),
			refetchInterval: 45 * 1000,
		})

		const refetch = () => {
			refetchBuy()
			refetchTiming()
		}

		useImperativeHandle(ref, () => ({
			refresh: refetch,
		}))

		const mergedData = useMemo(() => {
			const result: BuyRoot[] = []
			if (showOriginal && Array.isArray(buyData)) {
				result.push(...buyData.map((item: BuyRoot) => ({ ...item, 个股择时: "否" as const })))
			}
			if (showGeguZeshi && Array.isArray(timingData)) {
				result.push(...timingData.map((item: BuyRoot) => ({ ...item, 个股择时: "是" as const })))
			}
			return result
		}, [buyData, timingData, showOriginal, showGeguZeshi])

		return (
			<DataTable
				data={mergedData}
				refresh={refetch}
				columns={columns}
				pagination={false}
				loading={loadingBuy || loadingTiming}
				maxWidth="calc(100vw - 4rem - 2em)"
				placeholder="搜索买入计划..."
				emptyText="暂无买入计划，会在当日自动进行实盘选股之后，展示相关结果"
				actionOptions={(props) => <TradingPlanTableToolbar<BuyRoot> {...props} />}
			/>
		)
	},
)

export default BuyTable
