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
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/renderer/components/ui/card"
import { Button } from "@/renderer/components/ui/button"
import { Input } from "@/renderer/components/ui/input"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/renderer/components/ui/tooltip"
import { Badge } from "@/renderer/components/ui/badge"
import { SelectTabs } from "@/renderer/components/select-tabs"
import { cn } from "@/renderer/lib/utils"
import { Loader2, Play, Search, Wifi, WifiLow, WifiOff } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

const { getMinDataTaskStats, getMinDataTaskStatus } = window.electronAPI

type MinDataDataTypeFilter = "stock" | "etf" | "all"

export interface TaskRow {
	id: number
	run_date: string
	run_index: number
	stock_code: string
	stock_name?: string
	data_type?: string
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

const DATA_TYPE_MAP: Record<string, string> = {
	stock: "个股",
	etf: "ETF",
}

function DataTypeBadge({ dataType }: { dataType?: string }) {
	if (!dataType) return <span className="text-muted-foreground">-</span>
	const label = DATA_TYPE_MAP[dataType] ?? dataType
	return <Badge variant="outline">{label}</Badge>
}

function StatusBadge({ status }: { status: string }) {
	const config = STATUS_MAP[status] ?? {
		label: status,
		variant: "outline" as const,
	}
	return <Badge variant={config.variant}>{config.label}</Badge>
}

type NetworkQuality = "good" | "medium" | "poor"

function getNetworkQuality(
	sec: number,
	mode: "fast" | "stable",
): NetworkQuality {
	if (mode === "fast") {
		if (sec < 150) return "good"
		if (sec < 300) return "medium"
		return "poor"
	}
	if (sec < 240) return "good"
	if (sec < 300) return "medium"
	return "poor"
}

const NETWORK_CONFIG: Record<
	NetworkQuality,
	{ label: string; detail: string; icon: React.ElementType; className: string }
> = {
	good: {
		label: "网速良好",
		detail: "数据获取速度正常",
		icon: Wifi,
		className: "text-green-500",
	},
	medium: {
		label: "网速一般",
		detail: "数据获取速度较慢，建议检查网络连接",
		icon: WifiLow,
		className: "text-yellow-500",
	},
	poor: {
		label: "网速较差",
		detail: "数据获取速度很慢，请检查您的网络环境",
		icon: WifiOff,
		className: "text-red-500",
	},
}

function TaskProgress({
	statusCounts,
	total,
	isExecuting,
	mode,
}: {
	statusCounts: Record<string, number>
	total: number
	isExecuting: boolean
	mode?: "fast" | "stable"
}) {
	const [elapsedMs, setElapsedMs] = useState<number | null>(null)
	const [finishedElapsedSec, setFinishedElapsedSec] = useState<number | null>(
		null,
	)
	const startTimeRef = useRef<number>(0)
	const finalElapsedRef = useRef<number | null>(null)

	const completed =
		(statusCounts.success ?? 0) +
		(statusCounts.failed ?? 0) +
		(statusCounts.skipped ?? 0)
	const percent = total > 0 ? Math.round((completed / total) * 100) : 0

	useEffect(() => {
		if (!isExecuting) return
		startTimeRef.current = Date.now()
		setElapsedMs(0)
		setFinishedElapsedSec(null)
		finalElapsedRef.current = null
		const timer = setInterval(() => {
			setElapsedMs(Date.now() - startTimeRef.current)
		}, 1000)
		return () => {
			const finalMs = Date.now() - startTimeRef.current
			setElapsedMs(finalMs)
			finalElapsedRef.current = finalMs / 1000
			clearInterval(timer)
		}
	}, [isExecuting])

	useEffect(() => {
		if (!isExecuting && percent === 100 && finalElapsedRef.current !== null) {
			setFinishedElapsedSec(finalElapsedRef.current)
			finalElapsedRef.current = null
		}
	}, [isExecuting, percent])

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

	const quality =
		finishedElapsedSec !== null && mode
			? getNetworkQuality(finishedElapsedSec, mode)
			: null
	const netConfig = quality ? NETWORK_CONFIG[quality] : null

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between text-sm">
				<div className="flex items-center gap-2">
					<span className="text-muted-foreground">
						已完成 {completed} / {total}
						{timeInfo}
					</span>
					{netConfig && (
						<Tooltip>
							<TooltipTrigger asChild>
								<span className={cn("flex items-center gap-1 cursor-default", netConfig.className)}>
									<netConfig.icon className="h-4 w-4" />
									<span className="text-xs font-medium">{netConfig.label}</span>
								</span>
							</TooltipTrigger>
							<TooltipContent side="top">
								<p>{netConfig.detail}</p>
								<p className="text-muted-foreground text-xs mt-0.5">
									本次用时 {formatTqdmTime(finishedElapsedSec!)}，
									{mode === "fast" ? "极速" : "稳定"}模式
								</p>
							</TooltipContent>
						</Tooltip>
					)}
				</div>
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

export interface MinDataTaskTableProps {
	title: string
	description: string
	isExecuting: boolean
	onExecute: () => void
	mode?: "fast" | "stable"
	children?: React.ReactNode
	refreshTrigger?: number
}

export function MinDataTaskTable({
	title,
	description,
	isExecuting,
	onExecute,
	mode,
	children,
	refreshTrigger,
}: MinDataTaskTableProps) {
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
	const [dataTypeFilter, setDataTypeFilter] =
		useState<MinDataDataTypeFilter>("all")
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
				undefined,
				selectedRunIndex ?? undefined,
				dataTypeFilter,
			)
			setStats(result as unknown as TaskStatsResult)
		} catch (error) {
			console.error("[realtime-data] 查询统计失败:", error)
		}
	}, [selectedRunIndex, dataTypeFilter])

	const fetchPage = useCallback(async () => {
		try {
			const result = await getMinDataTaskStatus({
				runIndex: selectedRunIndex ?? undefined,
				status: statusFilter ?? undefined,
				search: searchValue || undefined,
				page,
				pageSize,
				dataType: dataTypeFilter,
			})
			setPageData(result as unknown as TaskPageResult)
		} catch (error) {
			console.error("[realtime-data] 查询分页失败:", error)
		}
	}, [
		selectedRunIndex,
		dataTypeFilter,
		statusFilter,
		searchValue,
		page,
		pageSize,
	])

	useEffect(() => {
		fetchStats()
		fetchPage()
	}, [fetchStats, fetchPage, refreshTrigger])

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

	const handleDataTypeFilterChange = (value: string) => {
		setDataTypeFilter(value as MinDataDataTypeFilter)
		setPage(1)
	}

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
						mode={mode}
					/>
				)}

				{stats.total > 0 && (
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium whitespace-nowrap">
								数据类型
							</span>
							<SelectTabs
								tabs={[
									{ label: "全部", value: "all" },
									{ label: "个股", value: "stock" },
									{ label: "ETF", value: "etf" },
								]}
								defaultValue={dataTypeFilter}
								onValueChange={handleDataTypeFilterChange}
							/>
						</div>
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
									placeholder="搜索代码"
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
										{dataTypeFilter === "all" && (
											<TableHead className="w-[72px] z-[1] bg-background border-b sticky top-0">
												类型
											</TableHead>
										)}
										<TableHead className="w-[120px] z-[1] bg-background border-b sticky top-0">
											代码
										</TableHead>
										<TableHead className="w-[80px] z-[1] bg-background border-b sticky top-0">
											状态
										</TableHead>
										<TableHead className="z-[1] bg-background border-b sticky top-0">
											开始时间
										</TableHead>
										<TableHead className="z-[1] bg-background border-b sticky top-0">
											结束时间
										</TableHead>
										<TableHead className="z-[1] bg-background border-b sticky top-0 w-[80px]">
											持续时间
										</TableHead>
										<TableHead className="z-[1] bg-background border-b sticky top-0">
											错误信息
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{datalist.map((row) => (
										<TableRow key={row.id}>
											{dataTypeFilter === "all" && (
												<TableCell>
													<DataTypeBadge dataType={row.data_type} />
												</TableCell>
											)}
											<TableCell className="font-mono">
												{row.stock_code}
											</TableCell>
											<TableCell>
												<StatusBadge status={row.status} />
											</TableCell>
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
