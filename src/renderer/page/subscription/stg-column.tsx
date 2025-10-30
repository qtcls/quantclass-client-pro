/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { Badge } from "@/renderer/components/ui/badge"
import { StrategyTableRowActions } from "@/renderer/components/ui/strategy-table-row-action"
import type { IStrategyList } from "@/renderer/page/subscription/stg-schema"
import type { ColumnDef } from "@tanstack/react-table"
import dayjs from "dayjs"

export const strategyColumns = (
	refresh: () => void,
): Array<ColumnDef<IStrategyList>> => [
	{
		accessorKey: "info",
		header: () => <div className="text-foreground">策略名称</div>,
		cell: ({ row }) => (
			<div className="text-muted-foreground">
				{row.original.displayName ?? row.original.info?.displayName ?? "-"}
			</div>
		),
	},
	{
		accessorKey: "period",
		header: () => <div className="text-foreground">换仓周期</div>,
		cell: ({ row }) => (
			<div className="text-muted-foreground">{row.original.period ?? "-"}</div>
		),
	},
	{
		accessorKey: "select_num",
		header: () => <div className="text-foreground">选中个数</div>,
		cell: ({ row }) => (
			<div className="text-muted-foreground">
				{row.original.select_num ?? "-"}
			</div>
		),
	},
	{
		accessorKey: "selected_strategy",
		header: () => <div className="text-foreground">轮动状态</div>,
		cell: ({ row }) => (
			<div>
				<Badge className="w-16 flex items-center justify-center">
					{row.original.info?.selected_strategy === ""
						? "-"
						: (row.original.info?.selected_strategy ?? "-")}
				</Badge>
			</div>
		),
	},
	{
		accessorKey: "buy_time",
		header: () => <div className="text-foreground">购买时间</div>,
		cell: ({ row }) => (
			<div className="text-muted-foreground">{`${row.original.buy_time ? dayjs(row.original.buy_time).format("YYYY-MM-DD HH:mm:ss") : "-- : --"}`}</div>
		),
	},
	{
		id: "action",
		cell: ({ row }) => <StrategyTableRowActions row={row} refresh={refresh} />,
	},
]
