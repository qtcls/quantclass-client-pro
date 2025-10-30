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
import { forwardRef, useImperativeHandle } from "react"

const BuyTable = forwardRef<BuyTableRef>((_, ref) => {
	const { getBuyInfoList } = window.electronAPI
	const columns = useBuyColumns()

	const { data, refetch, isLoading } = useQuery({
		queryKey: ["load-buy-info"],
		queryFn: () => getBuyInfoList(),
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
			refresh={refetch}
			columns={columns}
			pagination={false}
			loading={isLoading}
			maxWidth="calc(100vw - 12rem - 2em)"
			placeholder="搜索买入计划..."
			emptyText="暂无买入计划，会在当日自动进行实盘选股之后，展示相关结果"
			actionOptions={(props) => <TradingPlanTableToolbar<BuyRoot> {...props} />}
		/>
	)
})

export default BuyTable
