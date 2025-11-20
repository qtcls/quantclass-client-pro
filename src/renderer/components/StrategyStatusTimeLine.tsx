/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/renderer/components/ui/accordion"
import { Badge } from "@/renderer/components/ui/badge"
import { Button } from "@/renderer/components/ui/button"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/renderer/components/ui/card"
import DatePicker from "@/renderer/components/ui/date-picker"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/renderer/components/ui/tooltip"
import { cn } from "@/renderer/lib/utils"
import { ReloadIcon, ValueNoneIcon } from "@radix-ui/react-icons"
import { CalendarClock, CheckCircle2, Clock, Loader2 } from "lucide-react"

import StrategyStatusDesDialog from "@/renderer/components/StrategyStatusDesDialog"
import type { StrategyStatusDesDialogRef } from "@/renderer/components/StrategyStatusDesDialog"
import {
	selectedDateAtom,
	strategyStatusAtom,
} from "@/renderer/store/strategy-status"
import type { StrategyStatus } from "@/shared/types/strategy-status"
import {
	StrategyStatusEnum,
	StrategyStatusLabelEnum,
} from "@/shared/types/strategy-status"
import dayjs from "dayjs"
import { useAtom } from "jotai"
import { createContext, useContext, useRef, useState } from "react"
import { toast } from "sonner"

interface StatusTimeLineItemProps {
	statusItem: StrategyStatus
	itemIndex: number
}

const statusIconMap = {
	completed: {
		icon: CheckCircle2,
		color: "bg-green-500", // ✅ 已完成 - 绿色
	},
	incomplete: {
		icon: Clock,
		color: "bg-red-500", // ❌ 未完成 - 红色
	},
	in_progress: {
		icon: Loader2,
		color: "bg-blue-500", // 🔄 进行中 - 蓝色
	},
	pending: {
		icon: CalendarClock,
		color: "bg-gray-400", // ⏳ 未到预期时间 - 灰色
	},
}

const statusStyleMap = {
	completed:
		"bg-green-50 dark:bg-green-800 text-green-600 dark:text-green-200 border-green-200 dark:border-green-700",
	incomplete:
		"bg-red-50 dark:bg-red-800 text-red-600 dark:text-red-200 border-red-200 dark:border-red-700",
	in_progress:
		"bg-blue-50 dark:bg-blue-800 text-blue-600 dark:text-blue-200 border-blue-200 dark:border-blue-700",
	pending:
		"bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-700",
}

function renderTimeDisplay(time: Date | Date[] | null | undefined) {
	if (Array.isArray(time)) {
		return (
			<div className="flex gap-2">
				<span>{dayjs(time[0]).format("YYYY-MM-DD HH:mm:ss")}</span>
				<span>至</span>
				<span>{dayjs(time[1]).format("YYYY-MM-DD HH:mm:ss")}</span>
			</div>
		)
	}

	if (time) {
		return <span>{dayjs(time).format("YYYY-MM-DD HH:mm:ss")}</span>
	}

	return <span className="text-gray-400">--- ---</span>
}

function StatusCard({
	statusItem,
}: {
	statusItem: StrategyStatus
	onOpenDialog?: (item: StrategyStatus) => void
}) {
	const openDialogContext = useContext(TimeLineContext)
	const openDialog = () => {
		openDialogContext?.(statusItem)
	}
	return (
		<Card className="min-w-[180px] max-w-[400px] text-sm shadow-sm">
			<CardHeader className="px-3 pt-2 pb-1 border-b">
				<CardTitle className="text-sm font-semibold flex justify-between items-center gap-2">
					<span className="truncate flex-1" title={statusItem.title}>
						{statusItem.title}
					</span>
					<Badge
						variant="outline"
						className={cn(
							"text-xs px-2 py-0.5",
							statusStyleMap[statusItem.status],
						)}
					>
						{StrategyStatusLabelEnum[statusItem.status]}
					</Badge>
				</CardTitle>
			</CardHeader>

			<CardContent className="px-3 py-2 text-xs text-muted-foreground flex flex-col gap-1.5">
				{/* 描述 */}
				{statusItem.description && (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="truncate text-xs text-muted-foreground cursor-default">
									{statusItem.description}
								</div>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								<p className="max-w-xs">{statusItem.description}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}

				{/* 未到预计时间 */}
				{statusItem.status === StrategyStatusEnum.PENDING ? (
					<div className="mt-1 space-y-1.5">
						<div className="flex items-center group">
							<div className="w-1 h-1 bg-muted-foreground rounded-full" />
							<span className="ml-1.5">计划时间：</span>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-neutral-800/80 px-2 py-1 rounded cursor-default">
											{renderTimeDisplay(statusItem.plan.time)}
										</div>
									</TooltipTrigger>
									{statusItem.plan.timeDes && (
										<TooltipContent side="bottom">
											<p>{statusItem.plan.timeDes}</p>
										</TooltipContent>
									)}
								</Tooltip>
							</TooltipProvider>
						</div>
					</div>
				) : (
					<div className="mt-1 space-y-1.5">
						{/* 实际时间 */}
						<div className="flex items-center group">
							<div className="w-1 h-1 bg-gray-500 rounded-full" />
							<span className="ml-1.5">实际时间：</span>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-neutral-800/80 px-2 py-0.5 rounded cursor-default">
											{renderTimeDisplay(statusItem?.stat?.time)}
										</div>
									</TooltipTrigger>
									{statusItem?.stat?.timeDes && (
										<TooltipContent>
											<p>{statusItem.stat.timeDes}</p>
										</TooltipContent>
									)}
								</Tooltip>
							</TooltipProvider>
						</div>

						{/* 计划时间 */}
						<div className="flex items-center group cursor-default">
							<div className="w-1 h-1 bg-muted-foreground rounded-full" />
							<span className="ml-1.5">计划时间：</span>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="px-2">
											{renderTimeDisplay(statusItem.plan.time)}
										</div>
									</TooltipTrigger>
									{statusItem.plan.timeDes && (
										<TooltipContent>
											<p>{statusItem.plan.timeDes}</p>
										</TooltipContent>
									)}
								</Tooltip>
							</TooltipProvider>
						</div>
					</div>
				)}

				<div className="flex justify-end">
					{statusItem?.stats && statusItem?.stats.length > 0 ? (
						<Button
							size="sm"
							className="text-xs h-6 text-foreground lg:flex gap-1"
							variant="outline"
							onClick={openDialog}
						>
							查看详情
						</Button>
					) : (
						<></>
					)}
				</div>
			</CardContent>
		</Card>
	)
}

function TimeLineItem({ statusItem, itemIndex }: StatusTimeLineItemProps) {
	const isEven = itemIndex % 2 === 0
	const { icon: Icon, color } = statusIconMap[statusItem.status]

	return (
		<div className="flex-shrink-0 flex flex-col">
			{/* 上 */}
			<div className="h-[150px] flex items-end">
				{isEven ? (
					<div className="h-[130px]" />
				) : (
					<StatusCard statusItem={statusItem} />
				)}
			</div>

			{/* 中 */}
			<div className="h-[2px] border-t border-dashed border-gray-300 my-4 relative">
				<div
					className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-sm flex items-center justify-center ${color}`}
				>
					{Icon && <Icon className="text-white w-4 h-4" />}
				</div>
			</div>
			<div className="h-[150px] flex items-start">
				{/* 下 */}
				{isEven ? (
					<StatusCard statusItem={statusItem} />
				) : (
					<div className="h-[130px]" />
				)}
			</div>
		</div>
	)
}

const TimeLineContext = createContext<
	((statusItem: StrategyStatus) => void) | null
>(null)

export default function StrategyStatusTimeline() {
	const [selectedDate, setSelectedDate] = useAtom(selectedDateAtom)
	const [{ data: strategyStatusData, refetch }] = useAtom(strategyStatusAtom)
	const strategyStatusList: StrategyStatus[][] = strategyStatusData || []
	const dialogRef = useRef<StrategyStatusDesDialogRef>(null)
	const [currentDialogItem, setCurrentDialogItem] =
		useState<StrategyStatus | null>(null)

	const openDialogAction = (statusItem: StrategyStatus) => {
		setCurrentDialogItem(statusItem)
		dialogRef.current?.open()
	}

	const formatAndSetDateFn = (date: Date | undefined) => {
		if (date) {
			const tempDate = dayjs(date).format("YYYY-MM-DD")
			setSelectedDate(tempDate)
		} else {
			setSelectedDate("")
		}
	}

	return (
		<TimeLineContext.Provider value={openDialogAction}>
			<Card className="w-full">
				<CardHeader className="border-b px-4 py-3 ">
					<CardTitle className="pt-0 mt-0 flex flex-row justify-between items-center gap-1">
						<div className="flex items-center flex-wrap gap-2 ">
							<Clock className="w-5 h-5" />
							策略运行状态时间线
							<span className="text-xs text-muted-foreground font-medium">
								( 每分钟自动刷新一次 )
							</span>
						</div>
						<div className="flex gap-2 flex-wrap justify-end">
							<DatePicker
								className="w-42 h-8"
								value={selectedDate ? new Date(selectedDate) : new Date()}
								onChange={(date) => formatAndSetDateFn(date)}
							/>
							<Button
								size="sm"
								className=" h-8"
								variant="outline"
								onClick={() => {
									refetch()
									toast.success("策略运行状态时间线信息刷新成功")
								}}
							>
								<ReloadIcon className="mr-2 h-4 w-4" />
								刷新
							</Button>
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent>
					{strategyStatusList && strategyStatusList.length > 0 ? (
						<Accordion type="single" collapsible>
							{strategyStatusList.map(
								(strategyItem: StrategyStatus[], strategyIndex: number) => (
									<AccordionItem
										key={strategyItem[0].strategyName}
										value={strategyIndex.toString()}
									>
										<AccordionTrigger className="py-3">
											{strategyIndex + 1}. {strategyItem[0].strategyName}
										</AccordionTrigger>
										<AccordionContent>
											<div
												key={strategyItem[0].strategyName}
												className="overflow-x-auto max-w-full"
											>
												<div className="flex flex-nowrap pb-2">
													{strategyItem.map(
														(timeLineItem: StrategyStatus, index: number) => (
															<TimeLineItem
																key={`${strategyIndex}-${timeLineItem.tag}-${timeLineItem.title}`}
																statusItem={timeLineItem}
																itemIndex={index}
															/>
														),
													)}
												</div>
											</div>
										</AccordionContent>
									</AccordionItem>
								),
							)}
						</Accordion>
					) : (
						<div className="flex flex-col gap-1 pt-4 items-center justify-center">
							<ValueNoneIcon className="h-10 w-10 text-muted-foreground" />
							<span className="text-sm text-muted-foreground">暂无数据</span>
						</div>
					)}
				</CardContent>
			</Card>

			<StrategyStatusDesDialog
				ref={dialogRef}
				currentItem={currentDialogItem}
			/>
		</TimeLineContext.Provider>
	)
}
