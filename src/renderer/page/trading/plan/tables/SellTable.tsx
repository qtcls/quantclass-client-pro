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
import { forwardRef, useImperativeHandle } from "react"

const SellTable = forwardRef<SellTableRef>((_, ref) => {
	const { getSellInfoList } = window.electronAPI
	const columns = useSellColumns()
	const { data, refetch, isLoading } = useQuery({
		queryKey: ["load-sell-info"],
		queryFn: () => getSellInfoList(),
		refetchInterval: 45 * 1000,
	})

	useImperativeHandle(ref, () => ({
		refresh: () => {
			refetch()
		},
	}))

	return (
		<DataTable
			data={data ?? []}
			columns={columns}
			pagination={false}
			refresh={refetch}
			loading={isLoading}
			maxWidth="calc(100vw - 12rem - 2em)"
			emptyText="暂无卖出计划，会在当日自动进行实盘选股之后，展示相关结果"
			placeholder="搜索卖出计划..."
			actionOptions={(props) => (
				<TradingPlanTableToolbar<SellRoot> {...props} />
			)}
		/>
	)
})

export default SellTable
