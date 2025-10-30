/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { Button } from "@/renderer/components/ui/button"
import { DataTable } from "@/renderer/components/ui/data-table"
import { Tabs, TabsList, TabsTrigger } from "@/renderer/components/ui/tabs"
import { H2 } from "@/renderer/components/ui/typography"
import {
	usePositionStockInfoColumns,
	usePositionStrategyInfoColumns,
} from "@/renderer/page/position/columns"
import type {
	PositionStockInfoType,
	PositionStrategyInfoType,
} from "@/renderer/page/position/types"
import { useQuery } from "@tanstack/react-query"
import { RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

const { loadPositionJson } = window.electronAPI

export default function PositionInfo() {
	const [filename, setFilename] = useState("策略表现")

	// 持仓信息列
	const stockColumns = usePositionStockInfoColumns()
	const strategyColumns = usePositionStrategyInfoColumns()
	const {
		data: positions = { data: [], update_time: 0 },
		isLoading: loading,
		refetch,
	} = useQuery({
		queryKey: ["load-positions"],
		queryFn: async () => await loadPositionJson(filename),
		retry: false,
		refetchInterval: 1000 * 90,
	})

	useEffect(() => {
		if (!loading) refetch()
	}, [filename])

	return (
		<div className="flex flex-col h-full gap-3 py-3">
			<div className="flex flex-col">
				<H2>持仓信息</H2>
				<p className="text-muted-foreground">
					当前实盘账户中，各个策略的持仓明细
				</p>
			</div>
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Tabs
							defaultValue={filename}
							onValueChange={(value) => setFilename(value)}
						>
							<TabsList>
								<TabsTrigger value="策略表现">策略表现</TabsTrigger>
								<TabsTrigger value="个股表现">个股表现</TabsTrigger>
							</TabsList>
						</Tabs>
						<div className="text-sm text-muted-foreground">
							数据更新时间：
							{positions.update_time
								? new Date(positions.update_time * 1000).toLocaleString(
										"zh-CN",
										{
											year: "numeric",
											month: "2-digit",
											day: "2-digit",
											hour: "2-digit",
											minute: "2-digit",
											second: "2-digit",
											hour12: false,
										},
									)
								: "无"}
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							refetch()
							toast.success("刷新成功")
						}}
						className="flex items-center gap-2 h-8"
						disabled={loading}
					>
						<RefreshCw className="w-4 h-4" />
						刷新
					</Button>
				</div>
				{filename === "策略表现" ? (
					<DataTable<PositionStrategyInfoType, unknown>
						// 过滤掉占用资金为0的策略，满足下面的条件的，是换仓前的策略
						data={(positions.data || [])
							.filter(
								(item: PositionStrategyInfoType) =>
									(item.理论占比 ?? 0) !== 0 ||
									(item.实际占比 ?? 0) !== 0 ||
									(item.策略仓位 ?? 0) !== 0 ||
									(item.占用资金 ?? 0) !== 0 ||
									(item.当日盈亏 ?? 0) !== 0 ||
									(item.当日收益率 ?? 0) !== 0,
							)
							.sort(
								(a: PositionStrategyInfoType, b: PositionStrategyInfoType) =>
									(a.策略名称 ?? "").localeCompare(b.策略名称 ?? ""),
							)}
						columns={strategyColumns}
						loading={loading}
						refresh={() => {
							refetch()
						}}
						pagination={false}
						placeholder="查找所有列..."
						_maxHeight="calc(100vh - 275px)"
					/>
				) : (
					<DataTable<PositionStockInfoType, unknown>
						data={positions.data || []}
						columns={stockColumns}
						loading={loading}
						refresh={() => {
							refetch()
						}}
						pagination={false}
						placeholder="查找所有列..."
						_maxHeight="calc(100vh - 275px)"
					/>
				)}
			</div>
		</div>
	)
}
