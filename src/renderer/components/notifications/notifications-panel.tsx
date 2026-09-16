/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl-1.1/
 */

import { Badge } from "@/renderer/components/ui/badge"
import { Button } from "@/renderer/components/ui/button"
import { Label } from "@/renderer/components/ui/label"
import { ScrollArea } from "@/renderer/components/ui/scroll-area"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/renderer/components/ui/select"
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/renderer/components/ui/pagination"
import { cn } from "@/renderer/lib/utils"
import { unreadNotificationCountAtom } from "@/renderer/store"
import {
	NOTIFICATION_LEVELS,
	NOTIFICATION_SOURCES,
	type NotificationLevel,
	type NotificationSource,
} from "@/shared/constants.js"
import type {
	ClientNotification,
	NotificationListParams,
} from "@/shared/types/client-notification.js"
import { useAtomValue, useSetAtom } from "jotai"
import {
	AlertTriangle,
	Bell,
	CheckCheck,
	CircleCheck,
	Info,
	Inbox,
	Mail,
	RefreshCw,
	RotateCcw,
	XCircle,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

const {
	listNotifications,
	markNotificationRead,
	markAllNotificationsRead,
	getUnreadNotificationCount,
	onNotification,
} = window.electronAPI

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const

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

interface FilterState {
	level: "all" | NotificationLevel
	source: "all" | NotificationSource
	read: "all" | "unread" | "read"
}

const DEFAULT_FILTERS: FilterState = {
	level: "all",
	source: "all",
	read: "all",
}

const SOURCE_LABEL: Record<string, string> = {
	fuel: "Fuel",
	rocket: "Rocket",
	fusion: "Fusion",
}

/** 三条来源各一色，与 event 同行展示 */
const SOURCE_BADGE_CLASS: Record<NotificationSource, string> = {
	fuel: "border-amber-600/55 bg-amber-500/15 text-amber-950 shadow-none dark:border-amber-400/45 dark:bg-amber-500/20 dark:text-amber-50",
	rocket:
		"border-violet-600/55 bg-violet-500/15 text-violet-950 shadow-none dark:border-violet-400/45 dark:bg-violet-500/20 dark:text-violet-50",
	fusion:
		"border-sky-600/55 bg-sky-500/15 text-sky-950 shadow-none dark:border-sky-400/45 dark:bg-sky-500/20 dark:text-sky-50",
}

const LEVEL_LABEL: Record<string, string> = {
	info: "信息",
	success: "成功",
	warning: "警告",
	error: "错误",
}

function buildListParams(
	filters: FilterState,
	page: number,
	pageSize: number,
): NotificationListParams {
	const p: NotificationListParams = {
		limit: pageSize,
		offset: (page - 1) * pageSize,
		readFilter: filters.read,
	}
	if (filters.level !== "all") p.level = filters.level
	if (filters.source !== "all") p.source = filters.source
	return p
}

function rowMatchesFilters(row: ClientNotification, f: FilterState): boolean {
	const readFilter = f.read
	if (readFilter === "unread" && row.read_at) return false
	if (readFilter === "read" && !row.read_at) return false
	if (f.level !== "all" && row.level !== f.level) return false
	if (f.source !== "all" && row.source !== f.source) return false
	return true
}

function formatRelativeTime(iso: string): string {
	const ts = new Date(iso).getTime()
	if (!Number.isFinite(ts)) return iso
	const diffMs = Date.now() - ts
	const diffSec = Math.round(diffMs / 1000)
	if (diffSec < 60) return "刚刚"
	const diffMin = Math.round(diffSec / 60)
	if (diffMin < 60) return `${diffMin} 分钟前`
	const diffHr = Math.round(diffMin / 60)
	if (diffHr < 24) return `${diffHr} 小时前`
	const diffDay = Math.round(diffHr / 24)
	if (diffDay < 30) return `${diffDay} 天前`
	return new Date(ts).toLocaleDateString("zh-CN")
}

function formatAbsoluteTime(iso: string): string {
	const ts = new Date(iso).getTime()
	if (!Number.isFinite(ts)) return iso
	return new Date(ts).toLocaleString("zh-CN", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	})
}

function tryFormatPayload(payload: string | null): string | null {
	if (!payload) return null
	try {
		return JSON.stringify(JSON.parse(payload), null, 2)
	} catch {
		return payload
	}
}

function NotificationLevelIcon({ level }: { level: string }) {
	const label = LEVEL_LABEL[level] ?? level
	const common = "size-4 shrink-0"
	switch (level) {
		case "success":
			return (
				<span title={label} aria-label={label} className="inline-flex">
					<CircleCheck
						className={cn(
							common,
							"text-emerald-600 dark:text-emerald-500",
						)}
						strokeWidth={2.25}
						aria-hidden
					/>
				</span>
			)
		case "warning":
			return (
				<span title={label} aria-label={label} className="inline-flex">
					<AlertTriangle
						className={cn(common, "text-amber-600 dark:text-amber-500")}
						strokeWidth={2.25}
						aria-hidden
					/>
				</span>
			)
		case "error":
			return (
				<span title={label} aria-label={label} className="inline-flex">
					<XCircle
						className={cn(common, "text-destructive")}
						strokeWidth={2.25}
						aria-hidden
					/>
				</span>
			)
		default:
			return (
				<span title={label} aria-label={label} className="inline-flex">
					<Info
						className={cn(common, "text-sky-600 dark:text-sky-400")}
						strokeWidth={2.25}
						aria-hidden
					/>
				</span>
			)
	}
}

export function NotificationsPanel() {
	const [items, setItems] = useState<ClientNotification[]>([])
	const [total, setTotal] = useState(0)
	const [loading, setLoading] = useState(false)
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(50)
	const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
	const filtersRef = useRef(filters)
	filtersRef.current = filters
	const setUnread = useSetAtom(unreadNotificationCountAtom)
	const unreadCount = useAtomValue(unreadNotificationCountAtom)

	const refresh = useCallback(async () => {
		setLoading(true)
		try {
			const { items: list, total: nextTotal } = await listNotifications(
				buildListParams(filters, page, pageSize),
			)
			setItems(list ?? [])
			setTotal(nextTotal ?? 0)
			const count = await getUnreadNotificationCount()
			setUnread(count)
		} catch (err) {
			console.error("[notifications] refresh failed", err)
		} finally {
			setLoading(false)
		}
	}, [setUnread, filters, page, pageSize])

	useEffect(() => {
		void refresh()
	}, [refresh])

	const filterKey = `${filters.level}-${filters.source}-${filters.read}`

	// biome-ignore lint/correctness/useExhaustiveDependencies: 筛选条件变化时回到第一页
	useEffect(() => {
		setPage(1)
	}, [filterKey])

	const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)

	useEffect(() => {
		if (page > totalPages) setPage(totalPages)
	}, [page, totalPages])

	useEffect(() => {
		const unsubscribe = onNotification((_row) => {
			if (!rowMatchesFilters(_row, filtersRef.current)) return
			void refresh()
		})
		return unsubscribe
	}, [refresh])

	const handlePageSizeChange = (value: string) => {
		setPageSize(Number(value))
		setPage(1)
	}

	const handleMarkOne = async (id: number) => {
		try {
			const ok = await markNotificationRead(id)
			if (ok) {
				const readAt = new Date().toISOString()
				setItems((prev) =>
					prev.map((it) => (it.id === id ? { ...it, read_at: readAt } : it)),
				)
				const count = await getUnreadNotificationCount()
				setUnread(count)
			}
		} catch (err) {
			console.error("[notifications] mark one failed", err)
		}
	}

	const handleMarkAll = async () => {
		try {
			const changed = await markAllNotificationsRead()
			if (changed > 0) {
				toast.success(`已将 ${changed} 条通知标记为已读`)
			} else {
				toast.info("暂无未读通知")
			}
			setUnread(0)
			await refresh()
		} catch (err) {
			console.error("[notifications] mark all failed", err)
			toast.error("标记已读失败")
		}
	}

	const resetFilters = () => {
		setFilters(DEFAULT_FILTERS)
		setPage(1)
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
			<div className="shrink-0 space-y-0.5 border-b pb-2">
				<div className="flex items-center gap-2 text-sm font-semibold">
					<Bell className="size-4 shrink-0" />
					<span>通知中心</span>
				</div>
				<p className="text-xs text-muted-foreground">
					由内核推送的通知记录
				</p>
			</div>

			<div className="shrink-0 rounded-md border bg-muted/30 px-3 py-2.5">
				<div className="flex flex-wrap items-end gap-2.5">
					<div className="min-w-[128px] flex-1 basis-[8.5rem] space-y-1 sm:max-w-[9.5rem]">
						<Label className="text-xs leading-none text-muted-foreground">
							通知类型
						</Label>
						<Select
							value={filters.level}
							onValueChange={(v) =>
								setFilters((s) => ({
									...s,
									level: v as FilterState["level"],
								}))
							}
						>
							<SelectTrigger className="h-8 text-xs">
								<SelectValue placeholder="类型" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">全部</SelectItem>
								{NOTIFICATION_LEVELS.map((lv) => (
									<SelectItem key={lv} value={lv}>
										{LEVEL_LABEL[lv] ?? lv}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="min-w-[128px] flex-1 basis-[8.5rem] space-y-1 sm:max-w-[9.5rem]">
						<Label className="text-xs leading-none text-muted-foreground">
							内核来源
						</Label>
						<Select
							value={filters.source}
							onValueChange={(v) =>
								setFilters((s) => ({
									...s,
									source: v as FilterState["source"],
								}))
							}
						>
							<SelectTrigger className="h-8 text-xs">
								<SelectValue placeholder="内核" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">全部</SelectItem>
								{NOTIFICATION_SOURCES.map((src) => (
									<SelectItem key={src} value={src}>
										{SOURCE_LABEL[src] ?? src}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="min-w-[128px] flex-1 basis-[8.5rem] space-y-1 sm:max-w-[9.5rem]">
						<Label className="text-xs leading-none text-muted-foreground">
							已读状态
						</Label>
						<Select
							value={filters.read}
							onValueChange={(v) =>
								setFilters((s) => ({
									...s,
									read: v as FilterState["read"],
								}))
							}
						>
							<SelectTrigger className="h-8 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">全部</SelectItem>
								<SelectItem value="unread">未读</SelectItem>
								<SelectItem value="read">已读</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-wrap items-end gap-1.5">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-8 gap-1.5 px-2 text-xs"
							onClick={resetFilters}
						>
							<RotateCcw className="size-3.5" />
							重置
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="h-8 gap-1.5 px-2 text-xs"
							onClick={refresh}
							disabled={loading}
						>
							<RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
							刷新
						</Button>
						<Button
							variant="default"
							size="sm"
							className="h-8 gap-1.5 px-2 text-xs"
							onClick={handleMarkAll}
							disabled={unreadCount === 0}
						>
							<CheckCheck className="size-3.5" />
							全部已读
						</Button>
					</div>
				</div>
			</div>

			<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
				<ScrollArea className="min-h-[240px] flex-1 rounded-md border">
					{loading ? (
						<div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
							<Inbox className="size-8" />
							<p className="text-sm">加载中...</p>
						</div>
					) : total === 0 ? (
						<div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
							<Inbox className="size-8" />
							<p className="text-sm">暂无通知</p>
						</div>
					) : (
						<ul className="divide-y">
							{items.map((item) => {
								const isUnread = !item.read_at
								const sourceLabel =
									SOURCE_LABEL[item.source] ?? item.source
								const sourceClass =
									SOURCE_BADGE_CLASS[
										item.source as NotificationSource
									] ??
									"border-muted-foreground/35 bg-muted/40 text-foreground shadow-none"
								const payloadText = tryFormatPayload(item.payload)
								return (
									<li
										key={item.id}
										className={cn(
											"flex flex-col gap-1.5 px-3 py-2.5",
											isUnread && "bg-accent/30",
										)}
									>
										<div className="flex min-w-0 items-center justify-between gap-3">
											<div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
												<NotificationLevelIcon level={item.level} />
												{item.title ? (
													<span
														className="min-w-0 truncate text-sm font-semibold leading-tight"
														title={item.title}
													>
														{item.title}
													</span>
												) : null}
											</div>
											<div className="flex shrink-0 items-center gap-2 text-xs leading-none whitespace-nowrap">
												<span
													className="text-muted-foreground"
													title={formatAbsoluteTime(item.created_at)}
												>
													{formatRelativeTime(item.created_at)}
												</span>
												{Number(item.silent) === 0 ? (
													<div className="flex items-center gap-1 text-green-600 dark:text-green-500">
														<Mail
															className="size-3.5 shrink-0"
															strokeWidth={2.25}
															aria-hidden
														/>
														<span>已推送企业微信</span>
													</div>
												) : null}
												{isUnread && (
													<Button
														variant="ghost"
														size="sm"
														className="h-7 shrink-0 px-2 text-xs leading-none"
														onClick={() => handleMarkOne(item.id)}
													>
														标记已读
													</Button>
												)}
											</div>
										</div>
										<div className="text-sm leading-snug whitespace-pre-wrap break-words">
											{item.message}
										</div>
										{item.event ||
										(NOTIFICATION_SOURCES as readonly string[]).includes(
											item.source,
										) ? (
											<div className="flex min-w-0 flex-wrap items-center gap-2">
												<Badge
													variant="outline"
													className={cn(
														"shrink-0 px-1.5 py-0 text-[10px] font-semibold leading-none",
														sourceClass,
													)}
												>
													{sourceLabel}
												</Badge>
												{item.event ? (
													<code className="min-w-0 flex-1 font-mono text-[10px] leading-tight text-muted-foreground/80 break-all">
														{item.event}
													</code>
												) : null}
											</div>
										) : null}
										{payloadText ? (
											<details className="text-[11px] leading-snug text-muted-foreground">
												<summary className="cursor-pointer select-none">
													展开 payload
												</summary>
												<pre className="mt-0.5 rounded bg-muted p-1.5 text-[11px] leading-snug overflow-x-auto whitespace-pre">
													{payloadText}
												</pre>
											</details>
										) : null}
									</li>
								)
							})}
						</ul>
					)}
				</ScrollArea>

				{total > 0 ? (
					<div className="flex shrink-0 flex-col gap-2 border-t pt-2 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:gap-4 sm:text-sm">
							<span>共 {total} 条</span>
							<div className="flex items-center gap-2">
								<span>每页</span>
								<Select
									value={`${pageSize}`}
									onValueChange={handlePageSizeChange}
								>
									<SelectTrigger className="h-8 w-[70px] text-xs">
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
						<Pagination className="mx-0 w-full justify-center sm:w-auto">
							<PaginationContent className="flex-wrap">
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
				) : null}
			</div>
		</div>
	)
}
