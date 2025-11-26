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
import {
	CalendarClock,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Clock,
	Loader2,
	TriangleAlert,
} from "lucide-react"

import StrategyStatusDesDialog from "@/renderer/components/StrategyStatusDesDialog"
import type { StrategyStatusDesDialogRef } from "@/renderer/components/StrategyStatusDesDialog"
import {
	selectedDateAtom,
	strategyStatusAtom,
} from "@/renderer/store/strategy-status"
import type {
	StrategyStatus,
	StrategyStatusTag,
} from "@/shared/types/strategy-status"
import {
	StrategyStatusEnum,
	StrategyStatusLabelEnum,
} from "@/shared/types/strategy-status"
import dayjs, { type Dayjs } from "dayjs"
import { useAtom } from "jotai"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

interface StatusTimeLineItemProps {
	statusItem: StrategyStatus & {
		isMultiNodeMerging?: boolean
		nodeItems?: StrategyStatus[]
	}
	itemIndex: number
	isPrevSegmentActive: boolean
	isNextSegmentActive: boolean
	strategyItemLength: number
}

const statusIconMap = {
	completed: {
		icon: CheckCircle2,
		color: "bg-green-500", // 已完成 - 绿色
	},
	incomplete: {
		icon: TriangleAlert,
		color: "bg-amber-500", // 未完成 - 红色 改成黄色卡片
	},
	in_progress: {
		icon: Loader2,
		color: "bg-blue-500 animate-spin", // 进行中 - 蓝色
	},
	pending: {
		icon: CalendarClock,
		color: "bg-gray-400", // 未到预期时间 - 灰色
	},
}

const statusStyleMap = {
	completed:
		"bg-green-50 dark:bg-green-800 text-green-600 dark:text-green-200 border-green-200 dark:border-green-700",
	incomplete:
		"bg-amber-50 dark:bg-amber-800 text-amber-600 dark:text-amber-200 border-amber-200 dark:border-amber-700",
	in_progress:
		"bg-blue-50 dark:bg-blue-800 text-blue-600 dark:text-blue-200 border-blue-200 dark:border-blue-700",
	pending:
		"bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-700",
}

const cardStyleMap = {
	completed: "",
	incomplete:
		"bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900 dark:border-amber-600 dark:text-amber-500",
	in_progress:
		"bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-300",
	pending: "",
}

function renderTimeDisplay(
	time: [Date, Date | null] | null | undefined,
	timeformat = "HH:mm:ss",
) {
	if (Array.isArray(time) && time[0] !== null && time[1] !== null) {
		return (
			<div className="flex gap-2">
				<span>{dayjs(time[0]).format(timeformat)}</span>
				<span>至</span>
				<span>{dayjs(time[1]).format(timeformat)}</span>
			</div>
		)
	} else if (Array.isArray(time) && time[0] !== null && time[1] === null) {
		return (
			<div className="flex gap-2">
				<span>{dayjs(time[0]).format(timeformat)}</span>
				<span>至</span>
				<span>--- ---</span>
			</div>
		)
	} else if (time instanceof Date) {
		return <span>{dayjs(time).format(timeformat)}</span>
	} else {
		return <span className="text-gray-400">--- ---</span>
	}
}

function normalizeDate(value: Date | string | null | undefined): Dayjs | null {
	if (!value) {
		return null
	}
	const parsed = dayjs(value)
	return parsed.isValid() ? parsed : null
}

function isTimeBetweenNodes(
	leftNode: StrategyStatus | null,
	rightNode: StrategyStatus | null,
	nowMs: number,
) {
	if (!leftNode || !rightNode) {
		return false
	}

	// 获取两个节点的时间
	const leftTime = normalizeDate(leftNode.plan.time)
	const rightTime = normalizeDate(rightNode.plan.time)

	// 如果任何一个时间不存在或者右时间小于等于左时间，返回false
	if (!leftTime || !rightTime || rightTime < leftTime) {
		return false
	}

	// 检查当前时间是否在两个时间之间
	return nowMs >= leftTime.valueOf() && nowMs <= rightTime.valueOf()
}

function StatusCard({
	statusItem,
}: {
	statusItem: StrategyStatus
	onOpenDialog?: (item: StrategyStatus) => void
}) {
	const openDialogContext = useContext(TimeLineContext)
	const openDialog = (e: any) => {
		e.stopPropagation()
		openDialogContext?.(statusItem)
	}
	return (
		<Card
			className={`max-w-[280px] flex flex-col w-fit text-sm shadow-sm ${cardStyleMap[statusItem.status]}`}
		>
			<CardHeader className="px-3 pt-2 pb-1 border-b">
				<CardTitle className="text-sm font-semibold flex justify-between items-center gap-2">
					<span className="flex-1" title={statusItem.title}>
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
					<div className="truncate text-xs text-muted-foreground cursor-default">
						{statusItem.description}
					</div>
					// <TooltipProvider delayDuration={0}>
					// 	<Tooltip>
					// 		<TooltipTrigger asChild>

					// 		</TooltipTrigger>
					// 		<TooltipContent side="bottom">
					// 			<p className="max-w-xs">{statusItem.description}</p>
					// 		</TooltipContent>
					// 	</Tooltip>
					// </TooltipProvider>
				)}

				<div className="mt-1 space-y-1.5">
					{/* 计划时间 */}
					<div className="flex items-center group cursor-default">
						<div className="w-1 h-1 bg-muted-foreground rounded-full" />
						<span className="ml-1.5">计划：</span>
						<TooltipProvider delayDuration={0}>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="font-semibold text-gray-800 dark:text-gray-200 py-0.5 rounded cursor-default">
										{statusItem.tag === "SELECT_CLOSE"
											? "开盘后"
											: statusItem.plan.time
												? dayjs(statusItem.plan.time).format("HH:mm:ss")
												: "--- ---"}
									</div>
								</TooltipTrigger>

								{statusItem.plan.time && statusItem.tag !== "SELECT_CLOSE" && (
									<TooltipContent>
										<div>
											{dayjs(statusItem.plan.time).format(
												"YYYY-MM-DD HH:mm:ss",
											)}
										</div>
									</TooltipContent>
								)}
							</Tooltip>
						</TooltipProvider>
					</div>
					{statusItem.status === StrategyStatusEnum.PENDING ? (
						<>{/* 未到预计时间 */}</>
					) : (
						<div className="flex items-center group">
							<div className="w-1 h-1 bg-muted-foreground rounded-full" />
							<span className="ml-1.5">
								{statusItem.tag === "SELECT_CLOSE"
									? "最近一次执行："
									: "实际时间："}
							</span>
							<TooltipProvider delayDuration={0}>
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="font-semibold text-gray-800 dark:text-gray-200 py-0.5 rounded cursor-default">
											{renderTimeDisplay(statusItem?.stat?.time)}
										</div>
									</TooltipTrigger>
									{statusItem?.stat?.time && (
										<TooltipContent>
											<div>
												{renderTimeDisplay(
													statusItem?.stat?.time,
													"YYYY-MM-DD HH:mm:ss",
												)}
											</div>
										</TooltipContent>
									)}
								</Tooltip>
							</TooltipProvider>
						</div>
					)}
				</div>

				<div className="flex justify-end">
					{statusItem?.stats && statusItem?.stats.length > 0 ? (
						<Button
							size="sm"
							className="text-xs h-[22px] px-2 text-foreground lg:flex gap-1"
							variant="outline"
							onClick={(e) => openDialog(e)}
						>
							查看执行记录
						</Button>
					) : (
						<></>
					)}
				</div>
			</CardContent>
		</Card>
	)
}

function TimeLineItem({
	statusItem,
	itemIndex,
	isPrevSegmentActive,
	isNextSegmentActive,
}: StatusTimeLineItemProps) {
	const isEven = itemIndex % 2 === 0
	const { icon: Icon, color } = statusIconMap[statusItem.status]
	const [activeCard, setActiveCard] = useState<string | null>(null)
	const getMinWidth = (nodeItems: StrategyStatus[]) => {
		return nodeItems.reduce((count, item) => {
			return count + (Array.isArray(item.stat?.time) ? 1 : 0)
		}, 0)
	}

	const NodesTemplate = () => {
		return (
			<div
				className={cn(
					"relative min-h-[150px]",
					getMinWidth(statusItem?.nodeItems || []) > 0
						? "min-w-[260px]"
						: "min-w-[220px]",
				)}
			>
				{statusItem?.nodeItems?.map((item: StrategyStatus, index: number) => {
					const cardKey = `${statusItem.tag}-${item.tag}-${index}`
					const isActive = activeCard === cardKey

					return (
						<div
							key={cardKey}
							className="absolute transition-all duration-300 cursor-pointer min-w-fit"
							style={{
								zIndex: isActive ? 20 : statusItem.nodeItems!.length - index,
								left: `${index * 10}px`,
								bottom: `${index * 34}px`,
							}}
							onClick={(e) => {
								e.stopPropagation()
								setActiveCard(isActive ? null : cardKey)
							}}
						>
							<StatusCard statusItem={item} />
						</div>
					)
				})}
			</div>
		)
	}

	return (
		<div className="flex-shrink-0 flex flex-col">
			{/* 上 */}
			<div className="h-[200px] flex items-end">
				{isEven ? (
					<div className="h-[150px]" />
				) : ["preClose", "opening", "nextClose"].includes(statusItem.tag) ? (
					<div className="flex flex-col items-center justify-center gap-1">
						<div className="font-bold">{statusItem.title}</div>
						<div className="text-xs">
							{dayjs(statusItem.plan.time).format("YYYY-MM-DD HH:mm:ss")}
						</div>
					</div>
				) : statusItem?.isMultiNodeMerging ? (
					<NodesTemplate />
				) : (
					<StatusCard statusItem={statusItem} />
				)}
			</div>
			{/* 中 */}
			<div
				className={cn(
					"relative flex w-full items-center justify-center",
					["preClose", "opening", "nextClose"].includes(statusItem.tag)
						? "py-4"
						: "py-2",
				)}
			>
				{isPrevSegmentActive ? (
					<span className="absolute left-0 right-1/2 h-[3px]  bg-gradient-to-l from-sky-400 via-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.45)] animate-pulse" />
				) : (
					<span className="absolute left-0 right-1/2 h-[2px]  bg-border/60" />
				)}
				{isNextSegmentActive ? (
					<span className="absolute left-1/2 right-0 h-[3px]  bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.45)] animate-pulse" />
				) : (
					<span className="absolute left-1/2 right-0 h-[2px]  bg-border/60" />
				)}
				{["preClose", "opening", "nextClose"].includes(statusItem.tag) ? (
					<div className="relative z-10 flex h-4 w-4 items-center justify-center rounded-full bg-gray-400" />
				) : (
					<div
						className={cn(
							"relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-white  transition-all",
							color,
						)}
					>
						{Icon && <Icon className="h-5 w-5" />}
					</div>
				)}
			</div>
			<div className="h-[200px] flex items-start">
				{/* 下 */}
				{isEven ? (
					["preClose", "opening", "nextClose"].includes(statusItem.tag) ? (
						<div className="flex flex-col items-center justify-center gap-1">
							<div className="font-bold">{statusItem.title}</div>
							<div className="text-xs">
								{dayjs(statusItem.plan.time).format("YYYY-MM-DD HH:mm:ss")}
							</div>
						</div>
					) : statusItem?.isMultiNodeMerging ? (
						<NodesTemplate />
					) : (
						<StatusCard statusItem={statusItem} />
					)
				) : (
					<div className="h-[150px]" />
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
	const [strategyStatusList, setStrategyStatusList] = useState<
		StrategyStatus[][]
	>([])
	const dialogRef = useRef<StrategyStatusDesDialogRef>(null)
	const [currentDialogItem, setCurrentDialogItem] =
		useState<StrategyStatus | null>(null)
	const [currentTime, setCurrentTime] = useState(dayjs())
	const scrollRefs = useRef<(HTMLDivElement | null)[]>([])
	const [canScrollList, setCanScrollList] = useState<boolean[]>([])
	const [openItem, setOpenItem] = useState<string | undefined>(undefined)

	useEffect(() => {
		const timer = setInterval(() => setCurrentTime(dayjs()), 60_000)
		return () => clearInterval(timer)
	}, [])

	useEffect(() => {
		// 1.监听数据变化 展开折叠元素变化 窗口尺寸变化
		if (!strategyStatusList || !openItem) return

		const computeScroll = () => {
			const results = strategyStatusList.map((_, i) => {
				const el = scrollRefs.current[i]
				return el ? el.scrollWidth > el.clientWidth : false
			})
			setCanScrollList(results)
		}

		computeScroll()

		window.addEventListener("resize", computeScroll)

		return () => {
			window.removeEventListener("resize", computeScroll)
		}
	}, [strategyStatusList, openItem])

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

	// 获取权限最大的status值
	const getNodeStatus = (array: StrategyStatusEnum[]): StrategyStatusEnum => {
		if (!array || array.length === 0) {
			return StrategyStatusEnum.PENDING
		}

		// 状态优先级映射
		const priority = {
			[StrategyStatusEnum.COMPLETED]: 3,
			[StrategyStatusEnum.INCOMPLETE]: 2,
			[StrategyStatusEnum.IN_PROGRESS]: 1,
			[StrategyStatusEnum.PENDING]: 0,
		}

		// 返回优先级最高的状态
		return array.reduce((highest, current) => {
			return priority[current] > priority[highest] ? current : highest
		}, array[0])
	}

	useEffect(() => {
		if (!strategyStatusData || strategyStatusData.length === 0) {
			setStrategyStatusList([])
			return
		}

		const selected = dayjs(selectedDate)

		const preClose = {
			strategyName: "",
			tag: "preClose" as StrategyStatusTag,
			title: "收盘",
			description: "",
			status: "pending" as StrategyStatusEnum,
			plan: {
				time: selected
					.subtract(1, "day")
					.set("hour", 15)
					.set("minute", 1)
					.set("second", 0)
					.set("millisecond", 0)
					.toDate(),
			},
		}

		const opening = {
			strategyName: "",
			tag: "opening" as StrategyStatusTag,
			title: "开盘",
			description: "",
			status: "pending" as StrategyStatusEnum,
			plan: {
				time: selected
					.set("hour", 9)
					.set("minute", 30)
					.set("second", 0)
					.set("millisecond", 0)
					.toDate(),
			},
		}

		const nextClose = {
			strategyName: "",
			tag: "nextClose" as StrategyStatusTag,
			title: "收盘",
			description: "",
			status: "pending" as StrategyStatusEnum,
			plan: {
				time: selected
					.set("hour", 15)
					.set("minute", 0)
					.set("second", 0)
					.set("millisecond", 0)
					.toDate(),
			},
		}

		// 生成最终列表
		const result = strategyStatusData.map((item: StrategyStatus[]) => {
			const strategyName = item[0]?.strategyName || ""

			// 深克隆推荐用结构方式，避免 JSON.parse 丢失 Date
			const list = item.map((i) => ({ ...i }))

			// 头部：前一日收盘
			list.unshift({
				...preClose,
				strategyName,
			})

			// 第二项后插入开盘（即 index = 1 后）
			list.splice(2, 0, {
				...opening,
				strategyName,
			})

			// 尾部：当天收盘
			list.push({
				...nextClose,
				strategyName,
			})

			const processedList: (StrategyStatus & {
				isMultiNodeMerging?: boolean
				nodeItems?: StrategyStatus[]
			})[] = []
			let i = 0

			while (i < list.length) {
				const currentItem = list[i]
				const nextItem = list[i + 1]

				// 合并模糊择时信号和精确择时信号 放入数组中
				if (
					currentItem.tag === "SELECT_TIMING_SIG0" &&
					nextItem?.tag === "SELECT_TIMING_SIG1"
				) {
					const mergedItem = {
						...currentItem,
						status: getNodeStatus([currentItem.status, nextItem.status]),
						isMultiNodeMerging: true,
						nodeItems: [nextItem, currentItem],
					}
					processedList.push(mergedItem)
					i += 2
				}
				// 合并生成卖出计划和生成买入计划
				else if (
					currentItem.title.includes("生成卖出计划") &&
					nextItem?.title.includes("生成买入计划")
				) {
					const mergedItem = {
						...currentItem,
						title: "生成交易计划",
						description: "在卖出时间前2分钟生成交易计划",
					}
					processedList.push(mergedItem)
					i += 2
				} else {
					processedList.push(currentItem)
					i += 1
				}
			}

			return processedList
		})

		setStrategyStatusList(result)
	}, [strategyStatusData, selectedDate])

	const handleOpen = (value: string | undefined) => {
		setOpenItem(value)
	}

	const scrollLeft = (i: number) => {
		const el = scrollRefs.current[i]
		el?.scrollBy({ left: -300, behavior: "smooth" })
	}

	const scrollRight = (i: number) => {
		const el = scrollRefs.current[i]
		el?.scrollBy({ left: 300, behavior: "smooth" })
	}

	return (
		<TimeLineContext.Provider value={openDialogAction}>
			<Card className="w-full">
				<CardHeader className="border-b px-4 py-3">
					<CardTitle className="pt-0 mt-0 flex flex-row justify-between items-center gap-1">
						<div className="flex items-center flex-wrap gap-2">
							<Clock className="w-5 h-5" />
							策略运行状态时间线
							<span className="text-xs text-muted-foreground font-medium">
								( 每分钟自动刷新一次 )
							</span>
						</div>
						<div className="flex gap-2 flex-wrap justify-end">
							<Button
								size="sm"
								className="h-8"
								variant="outline"
								onClick={() => {
									refetch()
									setSelectedDate(undefined)
									toast.success("策略运行状态时间线信息刷新成功")
								}}
							>
								今天
							</Button>
							<DatePicker
								className="w-42 h-8"
								value={
									selectedDate
										? new Date(selectedDate)
										: new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
								}
								onChange={(date) => formatAndSetDateFn(date)}
							/>
							<Button
								size="sm"
								className="h-8"
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
						<Accordion
							type="single"
							collapsible
							value={openItem}
							onValueChange={handleOpen}
						>
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
											<div className="relative">
												{/* 左滚动按钮 */}
												{canScrollList[strategyIndex] && (
													<Button
														variant="outline"
														onClick={() => scrollLeft(strategyIndex)}
														className="w-10 h-10 absolute left-0 z-20
    bg-white/80 dark:bg-neutral-700 shadow rounded-full p-1 hover:bg-white dark:hover:bg-neutral-600 opacity-70
    top-[calc(50%-20px-8px)]"
													>
														<ChevronLeft />
													</Button>
												)}
												<div
													ref={(el) => {
														scrollRefs.current[strategyIndex] = el
													}}
													key={strategyItem[0].strategyName}
													className="overflow-x-auto max-w-full scroll-smooth"
												>
													<div className="flex flex-nowrap">
														{/* 策略状态时间线项目 */}
														{strategyItem.map(
															(timeLineItem: StrategyStatus, index: number) => {
																let nextItem = strategyItem[index + 1] ?? null
																const prevItem = strategyItem[index - 1] ?? null
																const nowMs = currentTime.valueOf()

																if (index === 0) {
																	nextItem = strategyItem[index + 2] ?? null
																}
																const isNextSegmentActive = isTimeBetweenNodes(
																	timeLineItem,
																	nextItem,
																	nowMs,
																)
																let isPrevSegmentActive = isTimeBetweenNodes(
																	prevItem,
																	timeLineItem,
																	nowMs,
																)

																if (index === 1 && isNextSegmentActive) {
																	isPrevSegmentActive = true
																}

																return (
																	<TimeLineItem
																		key={`${strategyIndex}-${timeLineItem.tag}-${timeLineItem.title}`}
																		statusItem={timeLineItem}
																		itemIndex={index}
																		isPrevSegmentActive={isPrevSegmentActive}
																		isNextSegmentActive={isNextSegmentActive}
																		strategyItemLength={strategyItem.length}
																	/>
																)
															},
														)}
													</div>
												</div>

												{/* 右滚动按钮 */}
												{canScrollList[strategyIndex] && (
													<Button
														variant="outline"
														onClick={() => scrollRight(strategyIndex)}
														className="w-10 h-10 absolute right-0 top-[calc(50%-20px-8px)] z-20 
      bg-white/80 dark:bg-neutral-700 shadow rounded-full p-1 hover:bg-white dark:hover:bg-neutral-600 opacity-70"
													>
														<ChevronRight />
													</Button>
												)}
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
