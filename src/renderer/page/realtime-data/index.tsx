/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { MinDataExecConfirmDialog } from "@/renderer/components/MinDataExecConfirmDialog"
import { SelectTabs } from "@/renderer/components/select-tabs"
import { Badge } from "@/renderer/components/ui/badge"
import { Button } from "@/renderer/components/ui/button"
import ButtonTooltip from "@/renderer/components/ui/button-tooltip"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/renderer/components/ui/card"
import { Checkbox } from "@/renderer/components/ui/checkbox"
import { Input } from "@/renderer/components/ui/input"
import { Label } from "@/renderer/components/ui/label"
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/renderer/components/ui/pagination"
import { Progress } from "@/renderer/components/ui/progress"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/renderer/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/renderer/components/ui/table"
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/renderer/components/ui/tabs"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/renderer/components/ui/tooltip"
import { H2 } from "@/renderer/components/ui/typography"
import { cn } from "@/renderer/lib/utils"
import {
	isMinDataUpdatingAtom,
	minDataAutoAccurateAtom,
	minDataAutoFuzzyAtom,
	minDataModeAtom,
	minDataTabAtom,
} from "@/renderer/store"
import { useAtom } from "jotai"
import { CircleHelp, Loader2, Play, RefreshCw, Search } from "lucide-react"
import { type FC, useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

const {
	execMinData,
	execMinDataFuzzy,
	getMinDataTaskStats,
	getMinDataTaskStatus,
	toggleMinDataSchedule,
	getMinDataScheduleStatus,
	onMinDataScheduleStatus,
	removeMinDataScheduleStatusListener,
} = window.electronAPI

interface TaskRow {
	id: number
	run_date: string
	run_index: number
	stock_code: string
	stock_name?: string
	status: string
	fetch_start_time?: string
	fetch_end_time?: string
	error_msg?: string
	created_at?: string
}

interface TaskStatsResult {
	runDate: string | null
	runIndex: number | null
	availableRunIndexes: number[]
	statusCounts: Record<string, number>
	total: number
	error?: string
}

interface TaskPageResult {
	datalist: TaskRow[]
	total: number
	error?: string
}

const STATUS_MAP: Record<
	string,
	{
		label: string
		variant:
			| "default"
			| "secondary"
			| "success"
			| "destructive"
			| "outline"
			| "info"
	}
> = {
	pending: { label: "等待中", variant: "secondary" },
	running: { label: "运行中", variant: "info" },
	success: { label: "成功", variant: "success" },
	failed: { label: "失败", variant: "destructive" },
	skipped: { label: "已跳过", variant: "outline" },
}

const PAGE_SIZE_OPTIONS = [20, 50, 100]

function getVisiblePages(
	current: number,
	total: number,
): (number | "ellipsis")[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

	const pages: (number | "ellipsis")[] = [1]

	if (current > 3) pages.push("ellipsis")

	const start = Math.max(2, current - 1)
	const end = Math.min(total - 1, current + 1)
	for (let i = start; i <= end; i++) pages.push(i)

	if (current < total - 2) pages.push("ellipsis")

	pages.push(total)
	return pages
}

function formatDuration(start?: string, end?: string): string {
	if (!start || !end) return "-"
	try {
		const a = new Date(start).getTime()
		const b = new Date(end).getTime()
		if (Number.isNaN(a) || Number.isNaN(b) || b < a) return "-"
		const ms = b - a
		if (ms < 1000) return `${ms}ms`
		const sec = Math.floor(ms / 1000)
		if (sec < 60) return `${(ms / 1000).toFixed(2)}秒`
		const m = Math.floor(sec / 60)
		const s = sec % 60
		return s > 0 ? `${m}分${s}秒` : `${m}分`
	} catch {
		return "-"
	}
}

function formatTqdmTime(seconds: number): string {
	const s = Math.round(seconds)
	if (s < 3600) {
		const m = Math.floor(s / 60)
		const sec = s % 60
		return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
	}
	const h = Math.floor(s / 3600)
	const m = Math.floor((s % 3600) / 60)
	const sec = s % 60
	return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

function formatSpeed(speed: number | null): string {
	if (speed === null) return "?只/s"
	if (speed >= 1) return `${speed.toFixed(2)}只/s`
	if (speed > 0) return `${(1 / speed).toFixed(2)}s/只`
	return "?只/s"
}

function StatusBadge({ status }: { status: string }) {
	const config = STATUS_MAP[status] ?? {
		label: status,
		variant: "outline" as const,
	}
	return <Badge variant={config.variant}>{config.label}</Badge>
}

function TaskProgress({
	statusCounts,
	total,
	isExecuting,
}: {
	statusCounts: Record<string, number>
	total: number
	isExecuting: boolean
}) {
	const [elapsedMs, setElapsedMs] = useState<number | null>(null)
	const startTimeRef = useRef<number>(0)

	const completed =
		(statusCounts.success ?? 0) +
		(statusCounts.failed ?? 0) +
		(statusCounts.skipped ?? 0)
	const percent = total > 0 ? Math.round((completed / total) * 100) : 0

	useEffect(() => {
		if (!isExecuting) return
		startTimeRef.current = Date.now()
		setElapsedMs(0)
		const timer = setInterval(() => {
			setElapsedMs(Date.now() - startTimeRef.current)
		}, 1000)
		return () => {
			setElapsedMs(Date.now() - startTimeRef.current)
			clearInterval(timer)
		}
	}, [isExecuting])

	const elapsedSec = elapsedMs !== null ? elapsedMs / 1000 : null
	const hasTiming = elapsedSec !== null && total > 0

	const speed =
		hasTiming && elapsedSec > 1 && completed > 0 ? completed / elapsedSec : null

	const remaining = total - completed
	const eta = speed !== null && remaining > 0 ? remaining / speed : null

	let timeInfo = ""
	if (hasTiming) {
		const elapsedStr = formatTqdmTime(elapsedSec)
		const etaStr =
			eta !== null ? formatTqdmTime(eta) : remaining === 0 ? "00:00" : "?"
		const speedStr = formatSpeed(speed)
		timeInfo = ` [${elapsedStr}<${etaStr}, ${speedStr}]`
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between text-sm">
				<span className="text-muted-foreground">
					已完成 {completed} / {total}
					{timeInfo}
				</span>
				<span className="font-medium">{percent}%</span>
			</div>
			<Progress value={percent} />
		</div>
	)
}

function StatusFilterBar({
	statusCounts,
	total,
	statusFilter,
	onStatusFilterChange,
}: {
	statusCounts: Record<string, number>
	total: number
	statusFilter: string | null
	onStatusFilterChange: (status: string | null) => void
}) {
	return (
		<div className="flex items-center gap-3 text-sm flex-wrap">
			<button
				type="button"
				className={`px-2 py-0.5 rounded-md text-xs cursor-pointer transition-colors ${
					statusFilter === null
						? "bg-primary text-primary-foreground"
						: "bg-muted text-muted-foreground hover:bg-muted/80"
				}`}
				onClick={() => onStatusFilterChange(null)}
			>
				全部 {total}
			</button>
			{Object.entries(statusCounts).map(([status, count]) => {
				const config = STATUS_MAP[status] ?? {
					label: status,
					variant: "outline" as const,
				}
				const isActive = statusFilter === status
				return (
					<button
						type="button"
						key={status}
						className="flex items-center gap-1 cursor-pointer"
						onClick={() => onStatusFilterChange(isActive ? null : status)}
					>
						<Badge
							variant={config.variant}
							className={`text-xs ${isActive ? "ring-2 ring-ring ring-offset-1" : ""}`}
						>
							{config.label}
						</Badge>
						<span>{count}</span>
					</button>
				)
			})}
		</div>
	)
}

function TaskTable({
	title,
	description,
	tableType,
	isExecuting,
	onExecute,
	children,
}: {
	title: string
	description: string
	tableType: "accurate" | "fuzzy"
	isExecuting: boolean
	onExecute: () => void
	children?: React.ReactNode
}) {
	const [stats, setStats] = useState<TaskStatsResult>({
		runDate: null,
		runIndex: null,
		availableRunIndexes: [],
		statusCounts: {},
		total: 0,
	})
	const [pageData, setPageData] = useState<TaskPageResult>({
		datalist: [],
		total: 0,
	})
	const [selectedRunIndex, setSelectedRunIndex] = useState<number | null>(null)
	const [statusFilter, setStatusFilter] = useState<string | null>(null)
	const [searchValue, setSearchValue] = useState("")
	const [searchInput, setSearchInput] = useState("")
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(50)
	const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const pageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

	const fetchStats = useCallback(async () => {
		try {
			const result = await getMinDataTaskStats(
				tableType,
				undefined,
				selectedRunIndex ?? undefined,
			)
			setStats(result as unknown as TaskStatsResult)
		} catch (error) {
			console.error(`[realtime-data] 查询 ${tableType} 统计失败:`, error)
		}
	}, [tableType, selectedRunIndex])

	const fetchPage = useCallback(async () => {
		try {
			const result = await getMinDataTaskStatus(tableType, {
				runIndex: selectedRunIndex ?? undefined,
				status: statusFilter ?? undefined,
				search: searchValue || undefined,
				page,
				pageSize,
			})
			setPageData(result as unknown as TaskPageResult)
		} catch (error) {
			console.error(`[realtime-data] 查询 ${tableType} 分页失败:`, error)
		}
	}, [tableType, selectedRunIndex, statusFilter, searchValue, page, pageSize])

	useEffect(() => {
		fetchStats()
		fetchPage()
	}, [fetchStats, fetchPage])

	useEffect(() => {
		if (isExecuting) {
			statsIntervalRef.current = setInterval(fetchStats, 1000)
			pageIntervalRef.current = setInterval(fetchPage, 1000)
		} else {
			if (statsIntervalRef.current) {
				clearInterval(statsIntervalRef.current)
				statsIntervalRef.current = null
			}
			if (pageIntervalRef.current) {
				clearInterval(pageIntervalRef.current)
				pageIntervalRef.current = null
			}
			fetchStats()
			fetchPage()
		}

		return () => {
			if (statsIntervalRef.current) clearInterval(statsIntervalRef.current)
			if (pageIntervalRef.current) clearInterval(pageIntervalRef.current)
		}
	}, [isExecuting, fetchStats, fetchPage])

	const handleStatusFilterChange = (status: string | null) => {
		setStatusFilter(status)
		setPage(1)
	}

	const handleSearch = () => {
		setSearchValue(searchInput)
		setPage(1)
	}

	const handleSearchKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") handleSearch()
	}

	const handleClearSearch = () => {
		setSearchInput("")
		setSearchValue("")
		setPage(1)
	}

	const handlePageSizeChange = (value: string) => {
		setPageSize(Number(value))
		setPage(1)
	}

	const datalist = pageData.datalist as TaskRow[]
	const totalPages = Math.ceil(pageData.total / pageSize) || 1
	const isAccurate = tableType === "accurate"

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between gap-4">
					<div className="space-y-1.5">
						<div className="flex items-center gap-4 flex-wrap">
							<CardTitle className="leading-tight">{title}</CardTitle>
							<Button
								onClick={onExecute}
								disabled={isExecuting}
								size="sm"
								className="hover:cursor-pointer shrink-0"
							>
								{isExecuting ? (
									<>
										<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
										执行中
									</>
								) : (
									<>
										<Play className="mr-1.5 h-3.5 w-3.5" />
										手动执行
									</>
								)}
							</Button>
						</div>
						<CardDescription>{description}</CardDescription>
					</div>
					{children && (
						<div className="flex items-center gap-2 shrink-0">{children}</div>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{stats.runDate && (
					<div className="flex items-center gap-4 text-sm">
						<span>日期：{stats.runDate}</span>
						{stats.runIndex !== null && (
							<span>轮次：第 {stats.runIndex} 轮</span>
						)}
						{stats.availableRunIndexes.length > 0 && (
							<div className="flex items-center gap-2">
								<Select
									value={
										selectedRunIndex !== null
											? String(selectedRunIndex)
											: "latest"
									}
									onValueChange={(v) => {
										setSelectedRunIndex(v === "latest" ? null : Number(v))
										setPage(1)
									}}
								>
									<SelectTrigger className="w-[120px]">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="latest">最新一轮</SelectItem>
										{stats.availableRunIndexes.map((idx) => (
											<SelectItem key={idx} value={String(idx)}>
												第 {idx} 轮
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</div>
				)}

				{stats.total > 0 && (
					<TaskProgress
						statusCounts={stats.statusCounts}
						total={stats.total}
						isExecuting={isExecuting}
					/>
				)}

				{stats.total > 0 && (
					<div className="flex items-center justify-between gap-4">
						<StatusFilterBar
							statusCounts={stats.statusCounts}
							total={stats.total}
							statusFilter={statusFilter}
							onStatusFilterChange={handleStatusFilterChange}
						/>
						<div className="flex items-center gap-2 shrink-0">
							<div className="relative">
								<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="搜索股票代码"
									value={searchInput}
									onChange={(e) => setSearchInput(e.target.value)}
									onKeyDown={handleSearchKeyDown}
									className="pl-9 w-[180px] h-8"
								/>
							</div>
							{searchValue && (
								<Button
									variant="ghost"
									size="sm"
									className="h-8 px-2"
									onClick={handleClearSearch}
								>
									清除
								</Button>
							)}
						</div>
					</div>
				)}

				{stats.total === 0 ? (
					<div className="py-8 text-center text-muted-foreground">暂无数据</div>
				) : datalist.length === 0 ? (
					<div className="py-8 text-center text-muted-foreground">
						无匹配记录
					</div>
				) : (
					<>
						<div className="max-h-[400px] overflow-auto rounded-md border">
							<Table>
								<TableHeader
									className={cn(
										"sticky top-0 z-[8] bg-background rounded-t-md",
										"after:content-[''] after:absolute after:bottom-[-10px] after:left-0 after:right-0 after:h-4 after:bg-gradient-to-b after:from-background after:to-transparent after:pointer-events-none",
									)}
								>
									<TableRow>
										<TableHead className="w-[120px] z-[1] bg-background border-b sticky top-0">
											股票代码
										</TableHead>
										{!isAccurate && (
											<TableHead className="z-[1] bg-background border-b sticky top-0">
												股票名称
											</TableHead>
										)}
										<TableHead className="w-[80px] z-[1] bg-background border-b sticky top-0">
											状态
										</TableHead>
										{isAccurate && (
											<>
												<TableHead className="z-[1] bg-background border-b sticky top-0">
													开始时间
												</TableHead>
												<TableHead className="z-[1] bg-background border-b sticky top-0">
													结束时间
												</TableHead>
												<TableHead className="z-[1] bg-background border-b sticky top-0 w-[80px]">
													持续时间
												</TableHead>
											</>
										)}
										{!isAccurate && (
											<TableHead className="z-[1] bg-background border-b sticky top-0 w-[80px]">
												持续时间
											</TableHead>
										)}
										<TableHead className="z-[1] bg-background border-b sticky top-0">
											错误信息
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{datalist.map((row) => (
										<TableRow key={row.id}>
											<TableCell className="font-mono">
												{row.stock_code}
											</TableCell>
											{!isAccurate && (
												<TableCell>{row.stock_name ?? "-"}</TableCell>
											)}
											<TableCell>
												<StatusBadge status={row.status} />
											</TableCell>
											{isAccurate && (
												<>
													<TableCell className="text-muted-foreground">
														{row.fetch_start_time ?? "-"}
													</TableCell>
													<TableCell className="text-muted-foreground">
														{row.fetch_end_time ?? "-"}
													</TableCell>
													<TableCell className="text-muted-foreground">
														{formatDuration(
															row.fetch_start_time,
															row.fetch_end_time,
														)}
													</TableCell>
												</>
											)}
											{!isAccurate && (
												<TableCell className="text-muted-foreground">
													{formatDuration(
														row.fetch_start_time,
														row.fetch_end_time,
													)}
												</TableCell>
											)}
											<TableCell className="text-destructive max-w-[200px]">
												{row.error_msg ? (
													<Tooltip>
														<TooltipTrigger asChild>
															<span className="block truncate cursor-default">
																{row.error_msg}
															</span>
														</TooltipTrigger>
														<TooltipContent
															side="top"
															className="max-w-md break-words whitespace-pre-wrap"
														>
															{row.error_msg}
														</TooltipContent>
													</Tooltip>
												) : (
													<span>-</span>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>

						<div className="flex items-center justify-between px-2">
							<div className="flex items-center gap-4 text-sm text-muted-foreground">
								<span>共 {pageData.total} 条</span>
								<div className="flex items-center gap-2">
									<span>每页</span>
									<Select
										value={`${pageSize}`}
										onValueChange={handlePageSizeChange}
									>
										<SelectTrigger className="h-8 w-[70px]">
											<SelectValue />
										</SelectTrigger>
										<SelectContent side="top">
											{PAGE_SIZE_OPTIONS.map((size) => (
												<SelectItem
													key={size}
													value={`${size}`}
													className="hover:cursor-pointer"
												>
													{size}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<span>行</span>
								</div>
							</div>
							<Pagination className="mx-0 w-auto">
								<PaginationContent>
									<PaginationItem>
										<PaginationPrevious
											onClick={() => setPage((p) => Math.max(1, p - 1))}
											disabled={page <= 1}
											className={
												page <= 1 ? "pointer-events-none opacity-50" : ""
											}
										/>
									</PaginationItem>
									{getVisiblePages(page, totalPages).map((p, i) =>
										p === "ellipsis" ? (
											<PaginationItem key={`ellipsis-${i}`}>
												<PaginationEllipsis />
											</PaginationItem>
										) : (
											<PaginationItem key={p}>
												<PaginationLink
													isActive={p === page}
													onClick={() => setPage(p)}
												>
													{p}
												</PaginationLink>
											</PaginationItem>
										),
									)}
									<PaginationItem>
										<PaginationNext
											onClick={() =>
												setPage((p) => Math.min(totalPages, p + 1))
											}
											disabled={page >= totalPages}
											className={
												page >= totalPages
													? "pointer-events-none opacity-50"
													: ""
											}
										/>
									</PaginationItem>
								</PaginationContent>
							</Pagination>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	)
}

const RealtimeData: FC = () => {
	const [mode, setMode] = useAtom(minDataModeAtom)
	const [activeTab, setActiveTab] = useAtom(minDataTabAtom)
	const [autoAccurate, setAutoAccurate] = useAtom(minDataAutoAccurateAtom)
	const [autoFuzzy, setAutoFuzzy] = useAtom(minDataAutoFuzzyAtom)
	const [isScheduleOn, setIsScheduleOn] = useAtom(isMinDataUpdatingAtom)
	const [isAccurateExecuting, setIsAccurateExecuting] = useState(false)
	const [isFuzzyExecuting, setIsFuzzyExecuting] = useState(false)
	const [execConfirmOpen, setExecConfirmOpen] = useState(false)
	const [execConfirmType, setExecConfirmType] = useState<
		"accurate" | "fuzzy" | null
	>(null)

	useEffect(() => {
		getMinDataScheduleStatus().then((status) => {
			setIsScheduleOn(status.isRunning)
			if (status.isRunning) {
				setMode(status.mode)
				setAutoAccurate(status.autoAccurate)
				setAutoFuzzy(status.autoFuzzy)
			}
		})
	}, [setIsScheduleOn, setMode, setAutoAccurate, setAutoFuzzy])

	useEffect(() => {
		onMinDataScheduleStatus((_event, status) => {
			if (status.type === "skipped") {
				toast.info("自动更新：Fuel 内核正忙，跳过本轮")
			} else if (status.type === "executing") {
				if (status.task === "accurate") {
					setIsFuzzyExecuting(false)
					setIsAccurateExecuting(true)
				} else if (status.task === "fuzzy") {
					setIsAccurateExecuting(false)
					setIsFuzzyExecuting(true)
				}
				toast.info(
					`自动更新：正在获取${status.task === "accurate" ? "准确" : "模糊"}数据...`,
				)
			} else if (status.type === "done") {
				setIsAccurateExecuting(false)
				setIsFuzzyExecuting(false)
				toast.success("自动更新：本轮数据获取完成")
			}
		})
		return () => removeMinDataScheduleStatusListener()
	}, [])

	const handleStartAutoUpdate = useCallback(async () => {
		if (!autoAccurate && !autoFuzzy) {
			toast.warning("请至少选择一种要自动更新的数据类型")
			return
		}
		await toggleMinDataSchedule({
			isOn: true,
			mode,
			autoAccurate,
			autoFuzzy,
		})
		setIsScheduleOn(true)
		toast.success("自动更新数据已启动")
	}, [mode, autoAccurate, autoFuzzy, setIsScheduleOn])

	const handleStopAutoUpdate = useCallback(async () => {
		await toggleMinDataSchedule({ isOn: false })
		setIsScheduleOn(false)
		toast.success("自动更新数据已停止")
	}, [setIsScheduleOn])

	const handleExecAccurate = useCallback(async () => {
		setIsAccurateExecuting(true)
		try {
			const result = await execMinData(mode)
			if (result.code === 200) {
				toast.success(result.message)
			} else if (result.code === 300) {
				toast.warning(result.message)
			} else {
				toast.error(result.message)
			}
		} catch (error) {
			toast.error("执行失败")
		} finally {
			setIsAccurateExecuting(false)
		}
	}, [mode])

	const handleExecFuzzy = useCallback(async () => {
		setIsFuzzyExecuting(true)
		try {
			const result = await execMinDataFuzzy()
			if (result.code === 200) {
				toast.success(result.message)
			} else if (result.code === 300) {
				toast.warning(result.message)
			} else {
				toast.error(result.message)
			}
		} catch (error) {
			toast.error("执行失败")
		} finally {
			setIsFuzzyExecuting(false)
		}
	}, [])

	const handleExecConfirmClick = useCallback((type: "accurate" | "fuzzy") => {
		setExecConfirmType(type)
		setExecConfirmOpen(true)
	}, [])

	const handleConfirmExec = useCallback(() => {
		setExecConfirmOpen(false)
		const t = execConfirmType
		setExecConfirmType(null)
		if (t === "accurate") handleExecAccurate()
		else if (t === "fuzzy") handleExecFuzzy()
	}, [execConfirmType, handleExecAccurate, handleExecFuzzy])

	return (
		<div className="h-full flex-1 flex-col space-y-4 md:flex pt-3">
			<div className="space-y-2">
				<H2>实时数据</H2>
				<p className="text-muted-foreground text-sm">
					获取 QMT 分钟级 K 线数据，支持准确数据和模糊数据两种模式
				</p>
				<p className="text-muted-foreground text-sm">
					{isScheduleOn
						? "自动更新中"
						: "点击启动自动更新，在交易时段内自动更新数据"}
				</p>
			</div>

			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<div>
						{isScheduleOn ? (
							<ButtonTooltip content="停止自动更新数据">
								<Button
									variant="default"
									size="icon"
									className="hover:cursor-pointer w-12 h-10 flex items-center justify-center"
									onClick={handleStopAutoUpdate}
								>
									<RefreshCw size={16} className="animate-spin" />
								</Button>
							</ButtonTooltip>
						) : (
							<ButtonTooltip content="启动自动更新数据">
								<Button
									size="icon"
									className="hover:cursor-pointer w-12 h-10 flex items-center justify-center"
									onClick={handleStartAutoUpdate}
								>
									<Play className="h-5 w-5" />
								</Button>
							</ButtonTooltip>
						)}
					</div>
					<div className="flex items-center gap-4">
						<div className="flex items-center space-x-2">
							<Checkbox
								id="auto-accurate"
								checked={autoAccurate}
								onCheckedChange={(v) => setAutoAccurate(v === true)}
								disabled={isScheduleOn}
							/>
							<Label
								htmlFor="auto-accurate"
								className="text-sm font-medium cursor-pointer"
							>
								准确 QMT 数据
							</Label>
						</div>
						<div className="flex items-center space-x-2">
							<Checkbox
								id="auto-fuzzy"
								checked={autoFuzzy}
								onCheckedChange={(v) => setAutoFuzzy(v === true)}
								disabled={isScheduleOn}
							/>
							<Label
								htmlFor="auto-fuzzy"
								className="text-sm font-medium cursor-pointer"
							>
								模糊 QMT 数据
							</Label>
						</div>
					</div>
				</div>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={(v) => setActiveTab(v as "accurate" | "fuzzy")}
			>
				<TabsList>
					<TabsTrigger value="accurate" className="relative">
						准确 QMT 数据
						{isAccurateExecuting && (
							<span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
						)}
					</TabsTrigger>
					<TabsTrigger value="fuzzy" className="relative">
						模糊 QMT 数据
						{isFuzzyExecuting && (
							<span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
						)}
					</TabsTrigger>
				</TabsList>
				<TabsContent value="accurate">
					<TaskTable
						title="准确 QMT 数据"
						description="获取5分钟准确K线数据，可选极速模式或稳定模式"
						tableType="accurate"
						isExecuting={isAccurateExecuting}
						onExecute={() => handleExecConfirmClick("accurate")}
					>
						<div className="flex items-center gap-2">
							<span className="font-semibold whitespace-nowrap flex items-center gap-1">
								性能模式
								<ButtonTooltip
									content={
										<div className="space-y-1">
											<div>极速模式：约 50 秒左右，速度快</div>
											<div>稳定模式：约 2-3 分钟左右，更稳定</div>
										</div>
									}
								>
									<CircleHelp className="h-4 w-4 text-muted-foreground hover:cursor-pointer" />
								</ButtonTooltip>
							</span>
							<SelectTabs
								tabs={[
									{ label: "极速", value: "fast" },
									{ label: "稳定", value: "stable" },
								]}
								defaultValue={mode}
								onValueChange={(value) => {
									setMode(value as "fast" | "stable")
									toast.success(
										`已切换为${value === "fast" ? "极速" : "稳定"}模式`,
									)
									if (isScheduleOn) {
										toggleMinDataSchedule({
											isOn: true,
											mode: value as "fast" | "stable",
											autoAccurate,
											autoFuzzy,
										})
									}
								}}
							/>
						</div>
					</TaskTable>
				</TabsContent>
				<TabsContent value="fuzzy">
					<TaskTable
						title="模糊 QMT 数据"
						description="获取模糊K线数据"
						tableType="fuzzy"
						isExecuting={isFuzzyExecuting}
						onExecute={() => handleExecConfirmClick("fuzzy")}
					/>
				</TabsContent>
			</Tabs>

			<MinDataExecConfirmDialog
				open={execConfirmOpen}
				onOpenChange={(open) => {
					setExecConfirmOpen(open)
					if (!open) setExecConfirmType(null)
				}}
				type={execConfirmType}
				onConfirm={handleConfirmExec}
			/>
		</div>
	)
}

export default RealtimeData
