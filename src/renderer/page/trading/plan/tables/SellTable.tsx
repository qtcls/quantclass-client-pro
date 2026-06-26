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
import { useSellColumns } from "@/renderer/page/trading/plan/columns/sell-column"
import type { SellRoot, SellTableRef } from "@/renderer/page/trading/plan/types"
import { useQuery } from "@tanstack/react-query"
import { forwardRef, useImperativeHandle, useMemo } from "react"

export interface SellTableProps {
	showOriginal: boolean
	showGeguZeshi: boolean
}

const SellTable = forwardRef<SellTableRef, SellTableProps>(
	({ showOriginal, showGeguZeshi }, ref) => {
		const { getSellInfoList, getSellTimingInfoList } = window.electronAPI
		const columns = useSellColumns()

		const { data: sellData, refetch: refetchSell, isLoading: loadingSell } = useQuery({
			queryKey: ["load-sell-info"],
			queryFn: () => getSellInfoList(),
			refetchInterval: 45 * 1000,
		})

		const { data: timingData, refetch: refetchTiming, isLoading: loadingTiming } = useQuery({
			queryKey: ["load-sell-timing-info"],
			queryFn: () => getSellTimingInfoList(),
			refetchInterval: 45 * 1000,
		})

		const refetch = () => {
			refetchSell()
			refetchTiming()
		}

		useImperativeHandle(ref, () => ({
			refresh: refetch,
		}))

		const mergedData = useMemo(() => {
			const result: SellRoot[] = []
			if (showOriginal && Array.isArray(sellData)) {
				result.push(...sellData.map((item: SellRoot) => ({ ...item, 个股择时: "否" as const })))
			}
			if (showGeguZeshi && Array.isArray(timingData)) {
				result.push(...timingData.map((item: SellRoot) => ({ ...item, 个股择时: "是" as const })))
			}
			return result
		}, [sellData, timingData, showOriginal, showGeguZeshi])

		return (
			<DataTable
				data={mergedData}
				columns={columns}
				pagination={false}
				refresh={refetch}
				loading={loadingSell || loadingTiming}
				maxWidth="calc(100vw - 4rem - 2em)"
				emptyText="暂无卖出计划，会在当日自动进行实盘选股之后，展示相关结果"
				placeholder="搜索卖出计划..."
				actionOptions={(props) => (
					<TradingPlanTableToolbar<SellRoot> {...props} />
				)}
			/>
		)
	},
)

export default SellTable
