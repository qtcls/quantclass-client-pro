/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { DataTableRowActions } from "@/renderer/components/ui/data-table-row-action"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/renderer/components/ui/tooltip"
import type { IDataListType } from "@/renderer/schemas/data-schema"
import type { ColumnDef } from "@tanstack/react-table"
import { Check, HardDrive, Server, TriangleAlert } from "lucide-react"

// -- 辅助函数：格式化日期时间字符串
// const formatDateTime = (dateTimeString: string): string => {
// 	const [year, month, day, hour, minute] = dateTimeString.split("-")
// 	return `${year}-${month}-${day} ${hour}:${minute}`
// }
import { cn } from "@renderer/lib/utils"

export const dataColumns = (
	refresh: () => Promise<any>,
	_isUpdating: boolean,
): Array<ColumnDef<IDataListType>> => [
	{
		accessorKey: "displayName",
		header: () => <div className="text-foreground">数据名称</div>,
		cell: ({ row }) => {
			const canIncrementalUpdate =
				row.original?.updateTime &&
				row.original?.dataTime &&
				row.original?.updateTime !== row.original?.dataTime &&
				row.original?.canAutoUpdate === 1

			const message = canIncrementalUpdate ? "数据有更新" : "数据已同步"

			return (
				<div className="flex items-center gap-2">
					<div className="text-foreground">
						{row.original?.displayName ?? "--"}
					</div>
					<Tooltip delayDuration={0}>
						<TooltipTrigger>
							<div
								className={cn(
									"flex items-center justify-center size-5 rounded-full",
									canIncrementalUpdate
										? "bg-warning/20 text-warning"
										: "bg-success/20 text-success",
								)}
							>
								{canIncrementalUpdate ? (
									<TriangleAlert size={12} />
								) : (
									<Check size={12} />
								)}
							</div>
						</TooltipTrigger>
						<TooltipContent sideOffset={10}>
							<p>{message}</p>
						</TooltipContent>
					</Tooltip>
				</div>
			)
		},
	},
	{
		accessorKey: "name",
		header: () => <div className="text-foreground">产品名称</div>,
		cell: ({ row }) => (
			<div className="text-muted-foreground text-sm">
				{row.original?.name ?? "--"}
			</div>
		),
	},
	{
		accessorKey: "dataContentTime",
		size: 80,
		header: () => (
			<Tooltip>
				<TooltipTrigger>
					<div className="flex items-center gap-1 text-foreground">
						<HardDrive size={16} /> <span>数据时间</span>{" "}
					</div>
				</TooltipTrigger>
				<TooltipContent sideOffset={10}>
					<p>本地保存的数据，最后一行对应的时间戳。（data content time）</p>
				</TooltipContent>
			</Tooltip>
		),
		cell: ({ row, table }) => {
			let dataContentTime = row.original.dataContentTime ?? "--:--:--"
			if (row.original.name === "coin-binance-spot-swap-preprocess-pkl-1h") {
				return (
					<div className="text-muted-foreground">
						{table
							.getRowModel()
							.rows.filter(
								(row) =>
									row.original.name === "coin-binance-swap-candle-csv-1h-daily",
							)[0]?.original?.dataContentTime ?? "--:--:--"}
					</div>
				)
			}

			// if (row.original.name === "stock-1h-trading-data-daily") {
			// 	return (
			// 		<div className="text-muted-foreground">
			// 			{row.original?.ts ? formatDateTime(row.original.ts) : "--:--:--"}
			// 		</div>
			// 	)
			// }
			if (row.original.dataContentTime === "1990-01-01") {
				dataContentTime = "--:--:--"
			}

			return (
				<div className="text-muted-foreground text-sm">{dataContentTime}</div>
			)
		},
	},
	{
		accessorKey: "dataTime",
		size: 120,
		header: () => (
			<Tooltip>
				<TooltipTrigger>
					<div className="flex items-center gap-1 text-foreground ">
						<Server size={16} /> <span>更新时间</span>
					</div>
				</TooltipTrigger>
				<TooltipContent sideOffset={10}>
					<p>量化小讲堂服务器更新本数据的时间（data update time）</p>
				</TooltipContent>
			</Tooltip>
		),
		cell: ({ row, table }) => {
			if (row.original.name === "coin-binance-spot-swap-preprocess-pkl-1h") {
				const dataTime =
					table
						.getRowModel()
						.rows.filter(
							(row) =>
								row.original.name === "coin-binance-swap-candle-csv-1h-daily",
						)[0]?.original?.dataTime ?? "--:--:--"

				return <div className="text-muted-foreground">{dataTime}</div>
			}
			if (
				row.original.dataContentTime !== "1990-01-01" &&
				row.original.dataTime === "1990-01-01 00:00:00"
			) {
				return (
					<div className="text-gray-400 flex gap-1 items-center">
						<Check size={16} /> 已完成全量更新
					</div>
				)
			}

			return row.original?.dataContentTime === "1990-01-01" ? (
				<div className="text-warning flex items-center gap-1">
					<TriangleAlert size={16} />
					需先完成全量更新
				</div>
			) : (
				<Tooltip delayDuration={0}>
					<TooltipTrigger
						className="text-xs text-muted-foreground hover:bg-muted-foreground/10 rounded-lg p-0.5 text-nowrap"
						tabIndex={0}
						onClick={(e) => e.preventDefault()} // 阻止鼠标点击导致的失焦，避免 tooltip 关闭
					>
						<div>云端：{row.original?.dataTime ?? "--:--:--"}</div>
						<div>本地：{row.original?.lastUpdateTime ?? "--:--:--"}</div>
					</TooltipTrigger>
					<TooltipContent sideOffset={6}>
						全量更新后，云端时间可能不准确，以数据时间为准。
						<br />
						下次增量更新时自动更新。
					</TooltipContent>
				</Tooltip>
			)
		},
	},
	// {
	// 	accessorKey: "lastUpdateTime",
	// 	size: 120,
	// 	header: () => <div className="text-foreground">客户端检查更新时间</div>,
	// 	cell: ({ row }) => (
	// 		<div className="text-muted-foreground">
	// 			{row.original?.lastUpdateTime || "--:--:--"}
	// 		</div>
	// 	),
	// },
	{
		id: "action",
		header: "操作",
		size: 60,
		cell: ({ row }) => <DataTableRowActions row={row} refresh={refresh} />,
	},
]
