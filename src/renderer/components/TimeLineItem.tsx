import { Badge } from "@/renderer/components/ui/badge"
import { Button } from "@/renderer/components/ui/button"
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
import type { StrategyStatus } from "@/shared/types/strategy-status"
import {
	StrategyStatusEnum,
	StrategyStatusLabelEnum,
} from "@/shared/types/strategy-status"
import dayjs from "dayjs"
import {
	CalendarClock,
	CheckCircle2,
	Loader2,
	TriangleAlert,
} from "lucide-react"
import { useContext, useState } from "react"
import { TimeLineContext } from "./StrategyStatusTimeLine"

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
		color: "bg-amber-500", // 未完成 - 黄色卡片
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

const cardStyleMap = {
	completed: "",
	incomplete:
		"bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900 dark:border-amber-600 dark:text-amber-500",
	in_progress:
		"bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-300",
	pending: "",
}

const renderTimeDisplay = (
	time: [Date, Date | null] | null | undefined,
	timeformat = "HH:mm:ss",
) => {
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

	const isStockTiming =
		statusItem.tag.includes("STOCK_TIMING_SIG1") ||
		statusItem.tag.includes("STOCK_TIMING_TRADE")
	return (
		<Card
			className={`max-w-[280px] flex flex-col w-fit text-sm shadow-lg relative overflow-hidden ${cardStyleMap[statusItem.status]}`}
		>
			<CardHeader className="px-2 pt-2 pb-1 border-b">
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

			<CardContent className="pl-3 pr-2 py-2 text-xs text-muted-foreground flex flex-col gap-1.5">
				{/* 描述 */}
				{statusItem.description && (
					<div className="truncate text-xs text-muted-foreground cursor-default">
						{statusItem.description}
					</div>
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
										{statusItem.tag === "SELECT_CLOSE" ? (
											"收盘后，开盘前"
										) : (statusItem.tag === "SELECT_TIMING_SIG0" ||
												statusItem.tag === "SELECT_TIMING_SIG1") &&
											statusItem.isStrategyPool ? (
											<div className="flex gap-2">
												<span>开盘后</span>至
												<span>
													{statusItem.plan.time
														? dayjs(statusItem.plan.time).format("HH:mm:ss")
														: "--- ---"}
												</span>
											</div>
										) : statusItem.plan.time ? (
											dayjs(statusItem.plan.time).format("HH:mm:ss")
										) : (
											"--- ---"
										)}
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
					{statusItem.status !== StrategyStatusEnum.PENDING && (
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
					{statusItem?.stats && statusItem?.stats.length > 0 && (
						<Button
							size="sm"
							className="text-xs h-[22px] px-2 text-foreground lg:flex gap-1"
							variant="outline"
							onClick={(e) => openDialog(e)}
						>
							查看执行记录
						</Button>
					)}
				</div>
			</CardContent>
			{isStockTiming && (
				<div
					aria-hidden
					className="absolute top-[38px] right-1 w-10 h-10 rounded-full border-1 border-purple-400/30
   flex items-center justify-center text-[10px] font-bold text-purple-500/35 select-none -rotate-[30deg]"
				>
					个股
				</div>
			)}
		</Card>
	)
}

export default function TimeLineItem({
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

	const NodesTemplate = ({ location }: { location: string }) => {
		// location 卡片所在位置 top bottom
		return (
			<div
				className={cn(
					"relative min-h-[150px]",
					getMinWidth(statusItem?.nodeItems || []) > 0
						? "min-w-[260px]"
						: "min-w-[224px]",
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
								opacity: isActive || (!activeCard && index === 0) ? 1 : 0.65,
								zIndex: isActive ? 20 : statusItem.nodeItems!.length - index,
								left: `${index * 10}px`,
								bottom: location === "top" ? `${index * 34}px` : undefined,
								top:
									location === "bottom"
										? `${((statusItem?.nodeItems?.length || 1) - index - 1) * 34}px`
										: undefined,
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
			{/* 上 215px*/}
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
					<NodesTemplate location="top" />
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
						<NodesTemplate location="bottom" />
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
