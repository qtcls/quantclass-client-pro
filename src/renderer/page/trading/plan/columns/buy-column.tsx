/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { BuyRoot } from "@/renderer/page/trading/plan/types"
import type { ColumnDef } from "@tanstack/react-table"
import dayjs from "dayjs"
import { useMemo } from "react"
import BuyBlacklistAddBtn from "../../buy-blacklist/add-btn"

export const useBuyColumns = (): ColumnDef<BuyRoot>[] => {
	return useMemo(() => {
		return [
			{
				id: "拉黑",
				accessorFn: (row) => row.证券代码,
				cell: ({ row }) => (
					<BuyBlacklistAddBtn
						stockCode={
							row.original.证券代码?.replace(
								/^(\d{6})\.([A-Z]{2})$/,
								(_, code, market) => market.toLowerCase() + code,
							) || row.original.证券代码
						}
					/>
				),
				size: 120,
			},
			{
				accessorKey: "证券代码",
				header: "证券代码",
				size: 100,
			},
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
				size: 120,
			},
			{
				accessorKey: "策略名称",
				header: "策略名称",
			},
			{
				accessorKey: "offset",
				header: "持仓周期",
				size: 80,
			},
			{
				accessorKey: "其他",
				header: "其他",
				cell: ({ row }) => {
					return (
						<div className="max-w-[200px] whitespace-normal break-words">
							{row.original.其他}
						</div>
					)
				},
			},
			{
				accessorKey: "分配金额",
				header: "分配金额",
				cell: ({ row }) => {
					const amount = row.original.分配金额
					return (
						<div className={amount && amount < 1000 ? "text-red-500" : ""}>
							{amount ?? "-"}
							{"¥"}
							{!!amount && amount < 1000 && (
								<span className="text-xs text-red-500">
									(金额过低可能导致下单失败)
								</span>
							)}
						</div>
					)
				},
			},
			{
				accessorKey: "预计交易时间",
				header: "预计交易时间",
			},
			{
				accessorKey: "是否下单",
				header: "是否下单",
				// -- 添加左边框作为分隔线
				cell: ({ row }) => <div>{row.original.是否下单}</div>,
			},
			{
				accessorKey: "委托编号",
				header: "委托编号",
			},
			{
				accessorKey: "成交均价",
				header: "成交均价",
				cell: ({ row }) => {
					return <div>{row.original.成交均价?.toFixed(2) ?? "-"}</div>
				},
			},
			{
				accessorKey: "订单标记",
				header: "订单标记",
				cell: ({ row }) => (
					<div className="max-w-[200px] whitespace-normal break-words">
						{row.original.订单标记}
					</div>
				),
			},
		]
	}, [])
}
