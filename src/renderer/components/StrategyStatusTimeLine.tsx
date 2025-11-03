import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/renderer/components/ui/accordion"
import { Badge } from "@/renderer/components/ui/badge"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/renderer/components/ui/card"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/renderer/components/ui/tooltip"
import { cn } from "@/renderer/lib/utils"
import { ValueNoneIcon } from "@radix-ui/react-icons"
import { CalendarClock, CheckCircle2, Clock, Loader2 } from "lucide-react"

import { Button } from "@/renderer/components/ui/button"
import DatePicker from "@/renderer/components/ui/date-picker"
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
import { useAtom, useAtomValue } from "jotai"

import StrategyStatusDesDialog from "@/renderer/components/StrategyStatusDesDialog"
import type { StrategyStatusDesDialogRef } from "@/renderer/components/StrategyStatusDesDialog"
import { useRef, useState } from "react"

interface StatusTimeLineItemProps {
	statusItem: StrategyStatus
	itemIndex: number
	onOpenDialog?: (item: StrategyStatus) => void
}

const mockStrategyStatusData = {
	data: [
		[
			{
				strategyName: "趋势突破策略",
				tag: "DATA_UPDATE",
				title: "数据加载",
				description: "从数据库加载基础行情数据",
				status: "completed",
				stat: {
					time: [
						new Date("2025-10-28T10:20:00"),
						new Date("2025-10-28T10:23:00"),
					],
					timeDes: "数据成功加载完成",
				},
				plan: {
					time: new Date("2025-10-28T10:00:00"),
					timeDes: "预计 10:00 启动数据加载",
				},
				stats: [
					{
						time: [
							new Date("2025-10-28T10:20:00"),
							new Date("2025-10-28T10:23:00"),
						],
						timeDes: "数据成功加载完成1",
						message: ["数据1", "数据2"],
						batchId: 2,
					},
					{
						time: [
							new Date("2025-10-28T10:25:00"),
							new Date("2025-10-28T10:28:00"),
						],
						timeDes: "数据成功加载完成2",
						message: ["数据1", "数据2"],
						batchId: 3,
					},
				],
			},
			{
				tag: "step-2",
				title: "特征计算",
				description: "计算因子特征：均线、成交量波动等",
				status: "in_progress",
				stat: {
					time: new Date("2025-10-28T10:30:00"),
					timeDes: "正在进行特征计算...",
				},
				plan: {
					time: new Date("2025-10-28T10:25:00"),
					timeDes: "预计在 10:25 启动计算任务",
				},
			},
			{
				tag: "step-3",
				title: "信号生成",
				description: "根据特征生成交易信号",
				status: "pending",
				stat: null,
				plan: {
					time: new Date("2025-10-28T11:00:00"),
					timeDes: "预计 11:00 开始信号计算",
				},
			},
			{
				tag: "step-4",
				title: "仓位调整",
				description: "根据信号调整持仓比例",
				status: "incomplete",
				stat: {
					time: new Date("2025-10-28T11:45:00"),
					timeDes: "任务执行失败：未能获取账户信息",
				},
				plan: {
					time: new Date("2025-10-28T11:15:00"),
					timeDes: "原计划 11:15 完成仓位调整",
				},
			},
		],
		[
			{
				strategyName: "波段均值回归",
				tag: "step-1",
				title: "参数优化",
				description: "使用遗传算法优化均值回归参数",
				status: "completed",
				stat: {
					time: new Date("2025-10-27T09:10:00"),
					timeDes: "优化成功，最佳参数 α=0.82",
				},
				plan: {
					time: new Date("2025-10-27T09:00:00"),
					timeDes: "预计 09:00 启动优化任务",
				},
			},
			{
				tag: "step-2",
				title: "回测验证",
				description: "对历史数据进行回测验证结果",
				status: "completed",
				stat: {
					time: new Date("2025-10-27T10:20:00"),
					timeDes: "回测完成，收益率 18.2%",
				},
				plan: {
					time: new Date("2025-10-27T10:00:00"),
					timeDes: "预计 10:00 启动回测",
				},
			},
			{
				tag: "step-3",
				title: "实时监控",
				description: "监控实时价格与信号偏离",
				status: "in_progress",
				stat: {
					time: new Date("2025-10-28T09:00:00"),
					timeDes: "系统正在实时监控中...",
				},
				plan: {
					time: new Date("2025-10-28T08:45:00"),
					timeDes: "预计 08:45 启动监控任务",
				},
			},
		],
	],
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
	onOpenDialog,
}: {
	statusItem: StrategyStatus
	onOpenDialog?: (item: StrategyStatus) => void
}) {
	const openDialog = () => {
		onOpenDialog?.(statusItem)
	}
	return (
		<>
			<Card className="min-w-[180px] max-w-[400px] text-sm shadow-sm">
				<CardHeader className="px-3 pt-2 pb-1 border-b">
					<CardTitle className="text-sm font-semibold flex justify-between items-center gap-2">
						<span className="truncate max-w-[160px]" title={statusItem.title}>
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
												{renderTimeDisplay(statusItem.stat?.time)}
											</div>
										</TooltipTrigger>
										{statusItem.stat?.timeDes && (
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
		</>
	)
}

function TimeLineItem({
	statusItem,
	itemIndex,
	onOpenDialog,
}: StatusTimeLineItemProps) {
	const isEven = itemIndex % 2 === 0
	const { icon: Icon, color } = statusIconMap[statusItem.status]

	return (
		<div className="flex-shrink-0 flex flex-col">
			{/* 上 */}
			<div className="h-[150px] flex items-end">
				{isEven ? (
					<div className="h-[130px]" />
				) : (
					<StatusCard statusItem={statusItem} onOpenDialog={onOpenDialog} />
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
					<StatusCard statusItem={statusItem} onOpenDialog={onOpenDialog} />
				) : (
					<div className="h-[130px]" />
				)}
			</div>
		</div>
	)
}

export default function StrategyStatusTimeline() {
	const [selectedDate, setSelectedDate] = useAtom(selectedDateAtom)
	const strategyStatusData = useAtomValue(strategyStatusAtom)
	const strategyStatusList: StrategyStatus[][] = strategyStatusData?.data || []
	const dialogRef = useRef<StrategyStatusDesDialogRef>(null)
	const [currentDialogItem, setCurrentDialogItem] =
		useState<StrategyStatus | null>(null)

	// 打开弹窗的方法
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
	// const strategyStatusList: StrategyStatus[][] =
	// 	mockStrategyStatusData?.data || []

	// console.log("strategyStatusList", strategyStatusList?.data)
	return (
		<>
			<Card className="w-full">
				<CardHeader className="border-b px-4 py-3 ">
					<CardTitle className="pt-0 mt-0 flex flex-row justify-between items-center gap-1">
						<div className="flex items-center gap-2">
							<Clock className="w-5 h-5" />
							策略运行状态时间线
						</div>
						{/* 时间选择 */}
						<DatePicker
							className="w-42 h-8"
							value={selectedDate ? new Date(selectedDate) : new Date()}
							onChange={(date) => formatAndSetDateFn(date)}
						/>
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
												<div className="flex  flex-nowrap pb-2">
													{strategyItem.map(
														(timeLineItem: StrategyStatus, index: number) => (
															<TimeLineItem
																key={`${strategyIndex}-${timeLineItem.tag}-${timeLineItem.title}`}
																statusItem={timeLineItem}
																itemIndex={index}
																onOpenDialog={openDialogAction}
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
		</>
	)
}
