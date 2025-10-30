/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { SellRoot } from "@/renderer/page/trading/plan/types"
import type { ColumnDef } from "@tanstack/react-table"
import dayjs from "dayjs"
import { useMemo } from "react"

export const useSellColumns = (): ColumnDef<SellRoot>[] => {
	return useMemo(() => {
		return [
			{
				accessorKey: "交易日期",
				header: "交易日期",
				cell: ({ row }) => {
					return (
						<div>
							{row.original.交易日期 &&
								dayjs(row.original.交易日期).format("YYYY-MM-DD")}
						</div>
					)
				},
			},
			{
				accessorKey: "策略名称",
				header: "策略名称",
			},
			{
				accessorKey: "卖出数量",
				header: "卖出数量",
				cell: ({ row }) => {
					return <div>{row.original.卖出数量 ?? "-"}</div>
				},
			},
			{
				accessorKey: "其他",
				header: "其他",
			},
			{
				accessorKey: "证券代码",
				header: "证券代码",
			},
			{
				accessorKey: "预计交易时间",
				header: "预计交易时间",
			},
			{
				accessorKey: "是否下单",
				header: "是否下单",
			},
			{
				accessorKey: "委托编号",
				header: "委托编号",
			},
			{
				accessorKey: "订单标记",
				header: "订单标记",
				cell: ({ row }) => (
					<div className="max-w-[90px] whitespace-normal break-words">
						{row.original.订单标记}
					</div>
				),
			},
		]
	}, [])
}
