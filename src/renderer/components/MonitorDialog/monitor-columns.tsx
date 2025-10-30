/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import MonitorRowAction from "@/renderer/components/MonitorDialog/monitor-row-action"
import type { IMonitorListType } from "@/renderer/components/MonitorDialog/monitor-schema"
import type { ColumnDef } from "@tanstack/react-table"

export const monitorColumns = (): Array<ColumnDef<IMonitorListType>> => [
	{
		accessorKey: "pid",
		header: () => <div className="text-foreground">pid</div>,
		cell: ({ row }) => (
			<div className="text-muted-foreground">
				{row.original?.pid ?? "未获取到"}
			</div>
		),
	},
	{
		accessorKey: "action",
		header: () => <div className="text-foreground">操作名称</div>,
		cell: ({ row }) => (
			<div className="text-muted-foreground">
				{row.original?.action ?? "未获取到"}
			</div>
		),
	},
	{
		accessorKey: "createdAt",
		header: () => <div className="text-foreground">创建时间</div>,
		cell: ({ row }) => (
			<div className="text-muted-foreground">
				{row.original?.createdAt ?? "未获取到"}
			</div>
		),
	},
	{
		id: "actions",
		cell: ({ row }) => <MonitorRowAction row={row} />,
	},
]
