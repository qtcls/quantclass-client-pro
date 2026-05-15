/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { RealTradingBackupDialog } from "@/renderer/components/RealTradingBackupDialog"
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
import { cn } from "@/renderer/lib/utils"
import { ReloadIcon, ValueNoneIcon } from "@radix-ui/react-icons"
import { Archive, ChevronLeft, ChevronRight, Clock } from "lucide-react"

import StrategyStatusDesDialog from "@/renderer/components/StrategyStatusDesDialog"
import type { StrategyStatusDesDialogRef } from "@/renderer/components/StrategyStatusDesDialog"
import { realMarketConfigSchemaAtom } from "@/renderer/store/storage"
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
import { useAtom, useAtomValue } from "jotai"
import { createContext, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import TimeLineItem from "./TimeLineItem"

interface SummaryItem {
	strategyName: string
	overallStatus: StrategyStatusEnum | null
	descList: string[]
	capWeight?: number // 策略权重，0 表示非实盘
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

export const TimeLineContext = createContext<
	((statusItem: StrategyStatus) => void) | null
>(null)

export default function StrategyStatusTimeline() {
	const [selectedDate, setSelectedDate] = useAtom(selectedDateAtom)
	const [{ data: strategyStatusData, refetch }] = useAtom(strategyStatusAtom)
	const realMarketConfig = useAtomValue(realMarketConfigSchemaAtom)
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
	const [isCurrentDay, setIsCurrentDay] = useState<boolean>(false)
	const [summaryList, setSummaryList] = useState<SummaryItem[]>([])
	const [backupDialogOpen, setBackupDialogOpen] = useState(false)

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

	const getSummaryListFn = () => {
		// 根据strategyStatusData获取每个策略的简要状态信息
		// 1.如果全部是已完成 则该策略状态status:"completed"是已完成 descList:[]
		// 2.如果有进行中的  则该策略状态status:"in_progress"是进行中 descList:[进行中的title1，...]
		// 3.如果没有进行中  有异常的 则该策略状态status:"incomplete"有异常 descList:[]
		// 4.如果全是未开始 则该策略状态status:"pending"是未开始 descList:[]
		// 5.其他情况 不显示

		// 计算每个策略的汇总状态
		const tempSummaryList = strategyStatusData!.map((strategyItem) => {
			const statuses = strategyItem.map((i) => i.status)

			const hasInProgress = statuses.includes(StrategyStatusEnum.IN_PROGRESS)
			const hasIncomplete = statuses.includes(StrategyStatusEnum.INCOMPLETE)
			const allCompleted = statuses.every(
				(s) => s === StrategyStatusEnum.COMPLETED,
			)
			const allPending = statuses.every((s) => s === StrategyStatusEnum.PENDING)

			let overallStatus: StrategyStatusEnum | null
			let descList: string[] = []

			if (allCompleted) {
				overallStatus = StrategyStatusEnum.COMPLETED
			} else if (hasInProgress) {
				overallStatus = StrategyStatusEnum.IN_PROGRESS
				descList = strategyItem
					.filter((i) => i.status === StrategyStatusEnum.IN_PROGRESS)
					.map((i) => i.title)
			} else if (hasIncomplete) {
				overallStatus = StrategyStatusEnum.INCOMPLETE
			} else if (allPending) {
				overallStatus = StrategyStatusEnum.PENDING
			} else {
				overallStatus = null
			}

			return {
				strategyName: strategyItem[0]?.strategyName ?? "",
				overallStatus,
				descList,
				capWeight: strategyItem[0]?.capWeight,
			}
		})

		return tempSummaryList
	}

	useEffect(() => {
		if (!strategyStatusData || strategyStatusData.length === 0) {
			setStrategyStatusList([])
			return
		}

		const selected = dayjs(
			selectedDate || new Date(new Date().getTime() + 8.5 * 60 * 60 * 1000),
		)

		const preClose = {
			strategyName: "",
			tag: "preClose" as StrategyStatusTag,
			title: "收盘后",
			description: "",
			status: "pending" as StrategyStatusEnum,
			plan: {
				time: selected
					.subtract(1, "day")
					.set("hour", 15)
					.set("minute", 31)
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

		// 计算每个策略的汇总状态
		setSummaryList(getSummaryListFn())

		// 生成最终列表
		const result = strategyStatusData.map((item: StrategyStatus[]) => {
			const strategyName = item[0]?.strategyName || ""
			const list = item.map((i) => ({ ...i }))

			// 头部：前一日收盘
			list.unshift({
				...preClose,
				strategyName,
			})

			// 第二项后插入开盘：无集合竞价卖出时插在 index 2；开启 use_open_sell 时多一项 TRADE_PRE_SELL，插在 index 3
			const openingInsertIndex = realMarketConfig?.use_open_sell === "1" ? 3 : 2
			list.splice(openingInsertIndex, 0, {
				...opening,
				strategyName,
			})

			// 在 REVERSE_REPO 之前插入收盘
			const reverseRepoIndex = list.findIndex((i) => i.tag === "REVERSE_REPO")
			list.splice(reverseRepoIndex, 0, {
				...nextClose,
				strategyName,
			})

			const processedList: (StrategyStatus & {
				isMultiNodeMerging?: boolean
				nodeItems?: StrategyStatus[]
			})[] = []
			let i = 0

			const sortMergedNodes = (a, b) => {
				// 精确在前（SIG1 在前(上)）
				if (a.tag === "SELECT_TIMING_SIG1") return -1
				if (b.tag === "SELECT_TIMING_SIG0") return 1

				// 卖出在前（SELL 在前(上)）
				if (a.tag === "TRADE_SELL_PLAN") return -1
				if (b.tag === "TRADE_BUY_PLAN") return 1

				// 个股择时在前（SELECT_TIMING 在前(上)）
				if (a.tag.includes("STOCK_TIMING_SIG1")) return -1
				if (b.tag.includes("STOCK_TIMING_TRADE")) return 1

				return 0
			}

			while (i < list.length) {
				const currentItem = list[i]
				const nextItem = list[i + 1]

				const isTimingMerge =
					["SELECT_TIMING_SIG0", "SELECT_TIMING_SIG1"].includes(
						currentItem.tag,
					) &&
					["SELECT_TIMING_SIG0", "SELECT_TIMING_SIG1"].includes(nextItem?.tag)

				const isPlanMerge =
					["TRADE_SELL_PLAN", "TRADE_BUY_PLAN"].includes(currentItem.tag) &&
					["TRADE_SELL_PLAN", "TRADE_BUY_PLAN"].includes(nextItem?.tag)

				const isStockTiming =
					(currentItem.tag.includes("STOCK_TIMING_TRADE") ||
						currentItem.tag.includes("STOCK_TIMING_SIG1")) &&
					(nextItem?.tag.includes("STOCK_TIMING_TRADE") ||
						nextItem?.tag.includes("STOCK_TIMING_SIG1"))

				if ((isTimingMerge || isPlanMerge || isStockTiming) && nextItem) {
					const nodeItems = [currentItem, nextItem].sort(sortMergedNodes)

					const mergedItem = {
						...currentItem,
						status: getNodeStatus([currentItem.status, nextItem.status]),
						isMultiNodeMerging: true,
						nodeItems,
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
	}, [strategyStatusData, selectedDate, realMarketConfig?.use_open_sell])

	useEffect(() => {
		if (selectedDate === undefined) {
			setIsCurrentDay(true)
			return
		}

		if (
			selectedDate ===
			dayjs(new Date(new Date().getTime() + 8.5 * 60 * 60 * 1000)).format(
				"YYYY-MM-DD",
			)
		) {
			setIsCurrentDay(true)
			return
		}

		setIsCurrentDay(false)
	}, [selectedDate])

	const handleOpen = (value: string | undefined) => {
		setOpenItem(value)
	}

	// 周六、周日为非交易日
	const displayDate =
		selectedDate ||
		dayjs(new Date(new Date().getTime() + 8.5 * 60 * 60 * 1000)).format(
			"YYYY-MM-DD",
		)
	const isNonTradingDay =
		dayjs(displayDate).day() === 0 || dayjs(displayDate).day() === 6

	const scrollLeft = (i: number) => {
		const el = scrollRefs.current[i]
		el?.scrollBy({ left: -200, behavior: "smooth" })
	}

	const scrollRight = (i: number) => {
		const el = scrollRefs.current[i]
		el?.scrollBy({ left: 200, behavior: "smooth" })
	}

	return (
		<TimeLineContext.Provider value={openDialogAction}>
			<Card className="w-full">
				<CardHeader className="border-b px-4 py-3">
					<CardTitle className="pt-0 mt-0 flex flex-row justify-between items-center gap-1">
						<div className="flex items-center flex-wrap gap-2">
							<Clock className="w-5 h-5" />
							策略实盘状态
						</div>
						<div className="flex gap-2 flex-wrap justify-end">
							<Button
								size="sm"
								className="h-8"
								variant={isCurrentDay ? "default" : "outline"}
								onClick={() => {
									setSelectedDate(undefined)
									refetch()
									toast.success("策略实盘状态信息刷新成功")
								}}
							>
								今天
							</Button>
							<DatePicker
								className="w-42 h-8"
								value={
									selectedDate
										? new Date(selectedDate)
										: new Date(new Date().getTime() + 8.5 * 60 * 60 * 1000)
								}
								onChange={(date) => formatAndSetDateFn(date)}
							/>
							<Button
								size="sm"
								className="h-8"
								variant="outline"
								onClick={() => setBackupDialogOpen(true)}
							>
								<Archive className="mr-2 h-4 w-4" />
								备份实盘数据
							</Button>
							<Button
								size="sm"
								className="h-8"
								variant="outline"
								onClick={() => {
									refetch()
									toast.success("策略实盘状态信息刷新成功")
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
											<div className="flex items-center gap-4">
												<span className="flex-shrink-0">
													{strategyIndex + 1}. {strategyItem[0].strategyName}
												</span>
												{summaryList.length > 0 &&
													(summaryList[strategyIndex].overallStatus ||
														isNonTradingDay) && (
														<div className="flex-1 min-w-0 flex items-center gap-2 ">
															{/* 总统状态 */}
															<Badge
																variant="outline"
																className={cn(
																	"text-xs px-2 py-0.5",
																	isNonTradingDay ||
																		summaryList[strategyIndex].capWeight === 0
																		? "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-700"
																		: statusStyleMap[
																				summaryList[strategyIndex]
																					.overallStatus!
																			],
																)}
															>
																{isNonTradingDay
																	? "非交易日"
																	: summaryList[strategyIndex].capWeight === 0
																		? "非实盘"
																		: StrategyStatusLabelEnum[
																				summaryList[strategyIndex]
																					.overallStatus!
																			]}
															</Badge>
															{/* 描述title */}
															{summaryList[strategyIndex].descList.length >
																0 && (
																<div className="flex-1 min-w-0 text-xs truncate text-muted-foreground">
																	(
																	{summaryList[strategyIndex].descList.join(
																		", ",
																	)}
																	)
																</div>
															)}
														</div>
													)}
											</div>
										</AccordionTrigger>
										<AccordionContent>
											<div className="relative">
												{/* 左滚动按钮 */}
												{canScrollList[strategyIndex] && (
													<Button
														variant="outline"
														onClick={() => scrollLeft(strategyIndex)}
														className="w-10 h-10 absolute left-0 z-20
	   bg-neutral-700 text-white hover:text-white hover:bg-neutral-800 dark:bg-white dark:hover:bg-white/80 dark:text-neutral-800 rounded-full p-1 opacity-70
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
	   bg-neutral-700 text-white hover:text-white hover:bg-neutral-800 dark:bg-white dark:hover:bg-white/80 dark:text-neutral-800 rounded-full p-1 opacity-70 "
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
			<RealTradingBackupDialog
				open={backupDialogOpen}
				onOpenChange={setBackupDialogOpen}
			/>
		</TimeLineContext.Provider>
	)
}
