/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import EditableNumberCell from "@/renderer/components/EditableNumberCell"
import { Badge } from "@/renderer/components/ui/badge"
import { DataTableColumnHeader } from "@/renderer/components/ui/data-table-column-heder"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/renderer/components/ui/tooltip"
import { useToggleAutoRealTrading } from "@/renderer/hooks"
import { DeleteStrategy } from "@/renderer/page/strategy/delete"
import StrategyEditDialog from "@/renderer/page/strategy/edit-dialog"
import type { SelectStgType } from "@/renderer/types/strategy"

import { useFusionManager } from "@/renderer/hooks/useFusionManager"
import { useStrategyManager } from "@/renderer/hooks/useStrategyManager"
import { CheckCircledIcon, InfoCircledIcon } from "@radix-ui/react-icons"
import type { ColumnDef } from "@tanstack/react-table"
import { useAtomValue } from "jotai"
import { HelpCircleIcon } from "lucide-react"
import { totalWeightAtom } from "../store/storage"

export const useGenLibraryColumn = (
	refresh: () => void,
	isDisabled = false,
	fusionIndex = -1,
): ColumnDef<SelectStgType>[] => {
	const totalWeight = useAtomValue(totalWeightAtom)
	const { updateFusionStgInRow } = useFusionManager()
	const { isAutoRocket } = useToggleAutoRealTrading()
	const { selectStgList, updateSelectStg } = useStrategyManager()

	const getRebalanceTime = (rebalanceTimeType: string) => {
		const rebalanceTimeList = [
			{
				label: "隔日换仓",
				value: "close-open",
			},
			{
				label: "早盘换仓",
				value: "open",
			},
			// {
			// 	label: "尾盘换仓",
			// 	value: "close",
			// },
		]
		const index = rebalanceTimeList.findIndex(
			(item) => item.value === rebalanceTimeType,
		)
		let rebalanceTimeLabel = rebalanceTimeType
		if (index === -1) {
			const [startTime, endTime] = rebalanceTimeType.split("-") // 使用 '-' 分割字符串
			if (startTime === endTime) {
				rebalanceTimeLabel = `${startTime.slice(0, 2)}:${startTime.slice(2)}`
			}
		} else {
			rebalanceTimeLabel = rebalanceTimeList[index].label
		}
		return rebalanceTimeLabel
	}

	const getSignalTime = (timing: any, override: any): string => {
		// 从 timing 和 override 的 factor_list 中合并所有因子分钟数据，找出最大值
		const allFactorLists: any[] = []

		if (timing?.factor_list && timing.factor_list.length > 0) {
			allFactorLists.push(...timing.factor_list)
		}

		if (override?.factor_list && override.factor_list.length > 0) {
			allFactorLists.push(...override.factor_list)
		}

		// 如果没有任何因子列表，重置为 "close"
		if (allFactorLists.length === 0) {
			return "不适用"
		}

		// 提取所有分钟数据（第 5 个元素）并筛选数字型
		const timeArr = allFactorLists.map((item) => item[4])
		const numericTimes = timeArr.filter(
			(item): item is string => typeof item === "string" && /^\d+$/.test(item),
		)

		// 计算全局最大值
		const maxTime =
			numericTimes.length > 0
				? numericTimes.reduce((max, current) => (current > max ? current : max))
				: "不适用"

		const tempTime =
			maxTime === "不适用"
				? "不适用"
				: `${maxTime.slice(0, 2)}:${maxTime.slice(2)}`

		return tempTime
	}

	return [
		{
			accessorKey: "cap_weight",
			header: () => (
				<div className="text-muted-foreground flex items-baseline gap-1 text-nowrap">
					资金占比:{" "}
					<span className="text-primary text-right w-8 font-bold">
						{Math.round((totalWeight / 1000) * 1000)}%
					</span>
				</div>
			),
			size: 80,
			maxSize: 80,
			cell: ({ row }) => {
				return (
					<EditableNumberCell
						className="w-24 pr-1"
						disabled={isAutoRocket}
						value={row.original.cap_weight ?? 0}
						onChange={async (newValue) => {
							if (fusionIndex === -1) {
								updateSelectStg(row.index, {
									...selectStgList[row.index],
									cap_weight: newValue,
								})
							} else {
								updateFusionStgInRow(
									fusionIndex,
									{ cap_weight: newValue },
									row.original,
									row.index,
								)
							}
						}}
					/>
				)
			},
		},
		{
			accessorKey: "name",
			// size: 100,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="策略名称" />
			),
			cell: ({ row }) => {
				if (row.original.cap_weight >= 0) {
					return (
						<div className="flex items-center gap-1">
							{!isDisabled && (
								<Badge variant="secondary" className="shrink-0 p-1">
									<CheckCircledIcon className="size-4 mr-1 text-success" />{" "}
									<span>实盘</span>
								</Badge>
							)}
							<span className="text-nowrap">{row.original.name}</span>
						</div>
					)
				}

				return <div>{row.original.name}</div>
			},
		},
		{
			accessorKey: "select_num",
			header: "选股数量",
			size: 60,
			enableResizing: false,
		},
		{
			accessorKey: "hold_period",
			header: "持仓周期",
			size: 60,
			enableResizing: false,
		},
		{
			header: "OFFSET",
			accessorKey: "offset_list",
			// size: 120,
			cell: ({ row }) => {
				return (
					<div className="whitespace-pre-wrap break-words truncate max-w-[260px] hover:bg-muted rounded-md p-1 cursor-pointer">
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="text-xs space-y-1">
									<div className="truncate">
										{(row.original as SelectStgType).offset_list &&
										(row.original as SelectStgType).offset_list.length > 0
											? (row.original as SelectStgType).offset_list.join(", ")
											: "--"}
									</div>
									<div className="truncate">
										{(row.original as SelectStgType)?.scalein_targets?.length
											? (row.original as SelectStgType)?.scalein_targets?.join(
													"/", // 使用箭头符号表示仓位分配
												)
											: "无"}
									</div>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<div className="text-xs space-y-1">
									<div>
										OFFSET：
										{(row.original as SelectStgType)?.offset_list?.length
											? (row.original as SelectStgType).offset_list.join(", ")
											: "--"}
									</div>
									<div>
										分批进场目标仓位(offset间仓位分配)：
										{(row.original as SelectStgType)?.scalein_targets?.length
											? (row.original as SelectStgType)?.scalein_targets?.join(
													"→", // 使用箭头符号表示仓位分配
												)
											: "未配置"}
									</div>
								</div>
							</TooltipContent>
						</Tooltip>
					</div>
				)
			},
		},
		{
			accessorKey: "rebalance_time",
			header: () => (
				<div className="flex items-center gap-1">
					<span>时间</span>
					<Tooltip>
						<TooltipTrigger asChild>
							<HelpCircleIcon className="size-4 cursor-pointer" />
						</TooltipTrigger>
						<TooltipContent
							side="top"
							className="max-w-xs text-xs z-auto"
							sideOffset={12} // 轻微偏移至上方，避免边界遮挡
						>
							<h3 className="font-bold"># 盘中择时时间</h3>
							<p>
								当设置“择时开仓”或者“择时离场”的波动率策略后，会根据策略的
								择时因子列表 计算出最大值，作为计算择时时间。
							</p>
						</TooltipContent>
					</Tooltip>
				</div>
			),
			cell: ({ row }) => {
				const signalTime =
					!(row.original as SelectStgType)?.signal_time ||
					(row.original as SelectStgType)?.signal_time === "close"
						? getSignalTime(
								(row.original as SelectStgType)?.timing,
								(row.original as SelectStgType)?.override,
							)
						: "不适用"
				const rebalanceTime = getRebalanceTime(
					(row.original as SelectStgType).rebalance_time ?? "close-open",
				)
				return (
					<>
						<div className="flex items-center gap-1">
							<span>盘中择时：{signalTime}</span>
							<Tooltip>
								<TooltipTrigger asChild>
									<InfoCircledIcon className="size-4 cursor-pointer" />
								</TooltipTrigger>
								<TooltipContent
									side="top"
									className="max-w-xs text-xs"
									sideOffset={12}
								>
									客户端会在{" "}
									<span className="font-bold">{signalTime}+1分钟 </span>
									开始获取盘中分钟数据，再计算出择时信号，并更新交易计划。换仓前2分钟生成新的买入卖出计划。
								</TooltipContent>
							</Tooltip>
						</div>
						<div className="flex items-center gap-1">
							<span>换仓时间：{rebalanceTime}</span>
							<Tooltip>
								<TooltipTrigger asChild>
									<InfoCircledIcon className="size-4 cursor-pointer" />
								</TooltipTrigger>
								<TooltipContent
									side="top"
									className="max-w-xs text-xs"
									sideOffset={12}
								>
									<p>
										当日换仓：在{rebalanceTime}的{" "}
										<span className="font-bold">前1分钟到后10分钟内</span>
										，生成随机的卖出时间，并随机秒数；同时在卖出时间上加上60-120秒随机间隔，生成买入时间。
										<hr className="my-1" />
										隔日换仓：在收盘前10分钟内随机，并随机秒数
									</p>
								</TooltipContent>
							</Tooltip>
						</div>
					</>
				)
			},
		},
		{
			accessorKey: "timing",
			header: "择时策略",
			cell: ({ row }) => {
				return (
					<>
						<div className="text-nowrap">
							开仓：{(row.original as SelectStgType).timing?.name ?? "无"}
						</div>
						<div className="text-nowrap">
							离场：{(row.original as SelectStgType)?.override?.name ?? "无"}
						</div>
					</>
				)
			},
		},
		{
			id: "action",
			size: 50,
			maxSize: 80,
			header: "操作",
			cell: ({ row }) => {
				return isAutoRocket ? (
					<Badge variant="secondary">实盘中</Badge>
				) : (
					<div className="flex items-center gap-1">
						<StrategyEditDialog
							strategy={row.original as SelectStgType}
							rowIndex={row.index}
							fusionIndex={fusionIndex}
						/>
						{!isDisabled && (
							<DeleteStrategy
								strategy={row.original as SelectStgType}
								rowIndex={row.index}
								strategyType="select"
								onSuccess={refresh}
								className="!relative !inset-auto"
							/>
						)}
					</div>
				)
			},
		},
	]
}
