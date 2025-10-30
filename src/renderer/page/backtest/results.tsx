/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import StrategyStatusTimeline from "@/renderer/components/StrategyStatusTimeLine"
import { Button } from "@/renderer/components/ui/button"
import { DataTable } from "@/renderer/components/ui/data-table"
import { DataTableColumnHeader } from "@/renderer/components/ui/data-table-column-heder"
import { DataTableHeaderFilter } from "@/renderer/components/ui/data-table-header-filter"
import { DataTableToolbar } from "@/renderer/components/ui/data-table-toolbar"
import { RebalanceTime } from "@/renderer/constant"
import {
	useBacktestResult,
	useRealResult,
} from "@/renderer/page/backtest/context"
import { csvFileNameAtom } from "@/renderer/store"
import { backtestExecTimeAtom } from "@/renderer/store/backtest"
import type { LatestResultType, RunResultType } from "@/renderer/types/backtest"
import {
	openBacktestResultFolder,
	openRealResultFolder,
} from "@/renderer/utils"
import { Tab, Tabs } from "@heroui/tabs"
import type { ColumnDef } from "@tanstack/react-table"
import { useAtom, useAtomValue } from "jotai"
import { FolderOpenIcon, Loader2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import BuyBlacklistAddBtn from "../trading/buy-blacklist/add-btn"

interface ResultTableProps {
	mode: "backtest" | "real"
}

export function RunResultTable({ mode }: ResultTableProps) {
	const is_backtest = mode === "backtest"
	const { data, loading, refresh } = is_backtest
		? useBacktestResult()
		: useRealResult()

	const [csvFileName, setCsvFileName] = useAtom(csvFileNameAtom)
	const columns = useColumns(csvFileName, mode)
	const execTime = useAtomValue(backtestExecTimeAtom)

	useEffect(() => {
		if (mode === "backtest") {
			execTime.startTime !== "--:--:--" && refresh()
		} else {
			refresh()
		}
	}, [refresh, setCsvFileName, mode, execTime.startTime])

	useEffect(() => {
		setCsvFileName(mode === "backtest" ? "最新选股结果" : "策略运行状态时间线")
	}, [mode, setCsvFileName])

	return (
		<div className="flex flex-col">
			{csvFileName === "策略运行状态时间线" ? (
				<>
					<ToolBar mode={mode} />
					<div className="mt-2">
						<StrategyStatusTimeline />
					</div>
				</>
			) : (
				<DataTable<RunResultType, unknown>
					fixedWidth={csvFileName === "最新选股结果"}
					titlePosition="top"
					columns={columns}
					data={data?.data ?? []}
					enableVirtualization={csvFileName === "选股结果"}
					loading={loading}
					pagination={false}
					actionOptions={(props) => (
						<DataTableToolbar {...props} enableSearch={false}>
							<ToolBar mode={mode} />
						</DataTableToolbar>
					)}
				/>
			)}
		</div>
	)
}

export const useColumns = (
	csvFileName: string,
	mode: "backtest" | "real",
): ColumnDef<RunResultType>[] => {
	const columns = useMemo(() => {
		const cols: ColumnDef<RunResultType>[] = [
			{
				accessorKey: "选股日期",
				size: 80,
				meta: {
					filterVariant: "select",
				},
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="选股日期" />
				),
				cell: ({ row }) => {
					return <div className="text-center">{row.original.选股日期}</div>
				},
				// enableResizing: false,
			},
			{
				id: "换仓时间",
				accessorFn: (row) => row.换仓时间,
				meta: {
					filterVariant: "select",
				},
				size: 80,
				header: ({ column }) => (
					<DataTableHeaderFilter
						className="w-[100px]"
						column={column}
						placeholder="换仓时间"
						formatSelectLabel={(value) => RebalanceTime[value]}
					/>
				),
				cell: ({ row }) => (
					<span>
						{row.original?.换仓时间
							? (RebalanceTime[row.original?.换仓时间] ??
								row.original?.换仓时间)
							: "--"}
					</span>
				),
			},
			{
				id: "股票名称",
				// header: ({ column }) => (
				// 	<DataTableColumnHeader column={column} title="股票名称" />
				// ),
				accessorFn: (row) => row.股票名称,
				cell: ({ row }) => (
					<span className="text-nowrap">{row.original.股票名称 ?? "--"}</span>
				),
			},
			{
				id: "股票代码",
				size: 100,
				enableResizing: false,
				header: "股票代码",
				accessorFn: (row) => row.股票代码,
				cell: ({ row }) => <span>{row.original.股票代码 ?? "--"}</span>,
			},
			{
				id: "持仓周期",
				header: ({ column }) => (
					<DataTableHeaderFilter
						className="w-[100px]"
						column={column}
						placeholder="持仓周期"
					/>
				),
				meta: {
					filterVariant: "select",
				},
				size: 100,
				enableResizing: false,
				accessorFn: (row) => row.持仓周期,
				cell: ({ row }) => (
					<span className="pl-4">{row.original.持仓周期 ?? "--"}</span>
				),
			},
			{
				id: "策略",
				meta: {
					filterVariant: "select",
				},
				header: ({ column }) => (
					<DataTableHeaderFilter
						className="w-[80px]"
						column={column}
						placeholder="策略"
					/>
				),
				size: 80,
				accessorFn: (row) => row.策略,
				cell: ({ row }) => (
					<span className="text-nowrap">{row.original.策略 ?? "--"}</span>
				),
			},
			{
				header: "目标资金占比",
				accessorFn: (row) => row.目标资金占比,
				cell: ({ row }) => {
					const amount = row.original.目标资金占比 ?? 0
					const shownAmount = amount * 100

					return (
						<div className="flex items-center gap-1 text-nowrap">
							{shownAmount.toFixed(2)} %
						</div>
					)
				},
			},
		]

		if (csvFileName === "最新选股结果") {
			return [
				...(mode === "real"
					? [
							{
								id: "拉黑",
								accessorFn: (row) => row.股票代码,
								cell: ({ row }) => (
									<BuyBlacklistAddBtn stockCode={row.original.股票代码} />
								),
							},
						]
					: []),
				{
					id: "交易日期",
					size: 80,
					accessorFn: (row) => row.交易日期,
					header: ({ column }) => (
						<DataTableColumnHeader column={column} title="交易日期" />
					),
					cell: ({ row }) => (
						<div className="text-center">{row.original?.交易日期 ?? "--"}</div>
					),
				},
				{
					id: "股票代码",
					size: 100,
					enableResizing: false,
					// header: ({ column }) => (
					// 	<DataTableColumnHeader column={column} title="股票代码" />
					// ),
					accessorFn: (row) => row.股票代码,
					cell: ({ row }) => (
						<span className="text-nowrap">{row.original.股票代码 ?? "--"}</span>
					),
				},
				{
					id: "股票名称",
					enableResizing: false,
					// header: ({ column }) => (
					// 	<DataTableColumnHeader column={column} title="股票名称" />
					// ),
					accessorFn: (row) => row.股票名称,
					cell: ({ row }) => <span>{row.original.股票名称 ?? "--"}</span>,
				},
				{
					header: "目标资金占比",
					accessorFn: (row) => row.目标资金占比,
					cell: ({ row }) => {
						const amount = row.original.目标资金占比 ?? 0
						const shownAmount = amount * 100

						return (
							<div className="flex items-center gap-1">
								{shownAmount.toFixed(2)} %
							</div>
						)
					},
				},
				{
					id: "预计股数",
					accessorFn: (row) => row.预计股数,
					cell: ({ row }) => <span>{row.original?.预计股数 ?? "--"}</span>,
					// size: 100,
					enableResizing: false,
				},
				{
					id: "资金分配",
					accessorFn: (row) => row.资金分配,
					cell: ({ row }) => (
						<span>
							￥
							{(row.original?.资金分配 ?? 0)
								.toString()
								.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
						</span>
					),
				},
				{
					id: "策略",
					meta: {
						filterVariant: "select",
					},
					header: ({ column }) => (
						<DataTableHeaderFilter
							className="w-[80px]"
							column={column}
							placeholder="策略"
						/>
					),
					size: 100,
					accessorFn: (row) => row.策略,
					cell: ({ row }) => (
						<span className="text-nowrap">{row.original.策略 ?? "--"}</span>
					),
				},
				{
					id: "持仓周期",
					header: ({ column }) => (
						<DataTableHeaderFilter
							className="w-[100px]"
							column={column}
							placeholder="持仓周期"
						/>
					),
					meta: {
						filterVariant: "select",
					},
					size: 100,
					enableResizing: false,
					accessorFn: (row) => row.持仓周期,
					cell: ({ row }) => (
						<span className="pl-4">{row.original.持仓周期 ?? "--"}</span>
					),
				},
				{
					id: "换仓时间",
					accessorFn: (row) => row.换仓时间,
					meta: {
						filterVariant: "select",
					},
					size: 80,
					header: ({ column }) => (
						<DataTableHeaderFilter
							className="w-[100px]"
							column={column}
							placeholder="换仓时间"
							formatSelectLabel={(value) => RebalanceTime[value]}
						/>
					),
					cell: ({ row }) => (
						<span>
							{row.original?.换仓时间
								? (RebalanceTime[row.original?.换仓时间] ??
									row.original?.换仓时间)
								: "--"}
						</span>
					),
				},
				{
					accessorKey: "选股日期",
					meta: {
						filterVariant: "select",
					},
					header: ({ column }) => (
						<DataTableColumnHeader column={column} title="选股日期" />
					),
					cell: ({ row }) => {
						return <span>{row.original.选股日期}</span>
					},
					enableResizing: false,
				},
			] as ColumnDef<LatestResultType>[]
		}

		return cols
	}, [csvFileName])

	return columns as ColumnDef<RunResultType>[]
}

// Tabs 导航组件
function ToolBar({ mode }: { mode: "backtest" | "real" }) {
	const [pending, setPending] = useState(false)
	const [csvFileName, setCsvFileName] = useAtom(csvFileNameAtom)
	const testTime = useAtomValue(backtestExecTimeAtom)
	const { refresh, resetData } =
		mode === "backtest" ? useBacktestResult() : useRealResult()

	return (
		<div className="w-full flex items-center gap-3">
			<Tabs
				size="sm"
				radius="sm"
				aria-label="结果展示"
				selectedKey={csvFileName}
				onSelectionChange={(key) => {
					if (csvFileName === key) return
					setCsvFileName(key as string)
					if (mode === "backtest" && testTime.startTime === "--:--:--") {
						resetData()
						return
					}
					setTimeout(() => {
						refresh()
					}, 100)
				}}
			>
				{mode === "real" ? (
					<Tab key="策略运行状态时间线" title="策略运行状态时间线" />
				) : (
					<></>
				)}
				<Tab key="最新选股结果" title="最新选股结果" />

				<Tab key="选股结果" title="历史选股结果" />
			</Tabs>

			<Button
				size="sm"
				variant="outline"
				className="gap-1"
				disabled={pending}
				onClick={async () => {
					setPending(true)
					mode === "backtest"
						? openBacktestResultFolder()
						: openRealResultFolder()
					setTimeout(() => {
						setPending(false)
					}, 750)
				}}
			>
				{pending ? (
					<Loader2 size={16} className="animate-spin" />
				) : (
					<FolderOpenIcon size={16} />
				)}
				打开策略结果文件夹
			</Button>
		</div>
	)
}
