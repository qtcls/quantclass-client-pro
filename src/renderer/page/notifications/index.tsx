/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { Badge } from "@/renderer/components/ui/badge"
import { Button } from "@/renderer/components/ui/button"
import { Input } from "@/renderer/components/ui/input"
import { Label } from "@/renderer/components/ui/label"
import { ScrollArea } from "@/renderer/components/ui/scroll-area"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/renderer/components/ui/select"
import { H2 } from "@/renderer/components/ui/typography"
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
import { useSetAtom } from "jotai"
import { Bell, CheckCheck, Inbox, RefreshCw, RotateCcw } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

const {
	listNotifications,
	markNotificationRead,
	markAllNotificationsRead,
	getUnreadNotificationCount,
	onNotification,
} = window.electronAPI

const LIST_LIMIT = 500

interface FilterState {
	level: "all" | NotificationLevel
	source: "all" | NotificationSource
	read: "all" | "unread" | "read"
	dateFrom: string
	dateTo: string
}

const DEFAULT_FILTERS: FilterState = {
	level: "all",
	source: "all",
	read: "all",
	dateFrom: "",
	dateTo: "",
}

const SOURCE_LABEL: Record<string, string> = {
	fuel: "Fuel",
	rocket: "Rocket",
	aqua: "Aqua",
	zeus: "Zeus",
}

const LEVEL_VARIANT: Record<
	string,
	"default" | "secondary" | "destructive" | "success" | "info" | "outline"
> = {
	info: "info",
	success: "success",
	warning: "outline",
	error: "destructive",
}

function levelBadgeClassName(level: string): string | undefined {
	if (level !== "warning") return undefined
	return "border-amber-500 bg-amber-100 text-amber-900 shadow-none hover:bg-amber-100/90 dark:border-amber-500 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-950/60"
}

const LEVEL_LABEL: Record<string, string> = {
	info: "信息",
	success: "成功",
	warning: "警告",
	error: "错误",
}

function buildListParams(filters: FilterState): NotificationListParams {
	const p: NotificationListParams = {
		limit: LIST_LIMIT,
		readFilter: filters.read,
	}
	if (filters.level !== "all") p.level = filters.level
	if (filters.source !== "all") p.source = filters.source
	if (filters.dateFrom.trim()) p.dateFrom = filters.dateFrom.trim()
	if (filters.dateTo.trim()) p.dateTo = filters.dateTo.trim()
	return p
}

function rowMatchesFilters(row: ClientNotification, f: FilterState): boolean {
	const p = buildListParams(f)
	const readFilter = p.readFilter ?? "all"
	if (readFilter === "unread" && row.read_at) return false
	if (readFilter === "read" && !row.read_at) return false
	if (p.level && row.level !== p.level) return false
	if (p.source && row.source !== p.source) return false
	const rowDay = row.created_at.slice(0, 10)
	if (p.dateFrom && rowDay < p.dateFrom) return false
	if (p.dateTo && rowDay > p.dateTo) return false
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

export default function NotificationsPage() {
	const [items, setItems] = useState<ClientNotification[]>([])
	const [loading, setLoading] = useState(false)
	const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
	const filtersRef = useRef(filters)
	filtersRef.current = filters
	const setUnread = useSetAtom(unreadNotificationCountAtom)

	const refresh = useCallback(async () => {
		setLoading(true)
		try {
			const list = await listNotifications(buildListParams(filters))
			setItems(list ?? [])
			const count = await getUnreadNotificationCount()
			setUnread(count)
		} catch (err) {
			console.error("[notifications] refresh failed", err)
		} finally {
			setLoading(false)
		}
	}, [setUnread, filters])

	useEffect(() => {
		void refresh()
	}, [refresh])

	useEffect(() => {
		const unsubscribe = onNotification((row) => {
			setItems((prev) => {
				if (prev.some((r) => r.id === row.id)) return prev
				if (!rowMatchesFilters(row, filtersRef.current)) return prev
				return [row, ...prev]
			})
		})
		return () => {
			unsubscribe()
		}
	}, [])

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
				const readAt = new Date().toISOString()
				setItems((prev) =>
					prev.map((it) => (it.read_at ? it : { ...it, read_at: readAt })),
				)
				toast.success(`已将 ${changed} 条通知标记为已读`)
			} else {
				toast.info("暂无未读通知")
			}
			setUnread(0)
		} catch (err) {
			console.error("[notifications] mark all failed", err)
			toast.error("标记已读失败")
		}
	}

	const resetFilters = () => {
		setFilters(DEFAULT_FILTERS)
	}

	const unreadInList = items.filter((it) => !it.read_at).length

	return (
		<div className="flex flex-col h-full gap-3 py-3">
			<div className="flex items-end justify-between gap-4 flex-wrap">
				<div>
					<H2>
						<span className="inline-flex items-center gap-2">
							<Bell className="size-7" />
							通知中心
						</span>
					</H2>
					<p className="text-muted-foreground mt-1">由内核推送的通知记录</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={refresh}
						disabled={loading}
					>
						<RefreshCw className={cn("size-4", loading && "animate-spin")} />
						刷新
					</Button>
					<Button
						variant="default"
						size="sm"
						onClick={handleMarkAll}
						disabled={unreadInList === 0}
					>
						<CheckCheck className="size-4" />
						全部标为已读
					</Button>
				</div>
			</div>

			<div className="rounded-md border bg-muted/30 p-3 space-y-3">
				<div className="flex flex-wrap items-end gap-3">
					<div className="space-y-1.5 w-[130px] min-w-[120px]">
						<Label className="text-xs text-muted-foreground">通知类型</Label>
						<Select
							value={filters.level}
							onValueChange={(v) =>
								setFilters((s) => ({
									...s,
									level: v as FilterState["level"],
								}))
							}
						>
							<SelectTrigger>
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
					<div className="space-y-1.5 w-[130px] min-w-[120px]">
						<Label className="text-xs text-muted-foreground">内核来源</Label>
						<Select
							value={filters.source}
							onValueChange={(v) =>
								setFilters((s) => ({
									...s,
									source: v as FilterState["source"],
								}))
							}
						>
							<SelectTrigger>
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
					<div className="space-y-1.5 w-[130px] min-w-[120px]">
						<Label className="text-xs text-muted-foreground">已读状态</Label>
						<Select
							value={filters.read}
							onValueChange={(v) =>
								setFilters((s) => ({
									...s,
									read: v as FilterState["read"],
								}))
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">全部</SelectItem>
								<SelectItem value="unread">未读</SelectItem>
								<SelectItem value="read">已读</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1.5 w-[150px]">
						<Label className="text-xs text-muted-foreground">开始日期</Label>
						<Input
							type="date"
							value={filters.dateFrom}
							onChange={(e) =>
								setFilters((s) => ({ ...s, dateFrom: e.target.value }))
							}
						/>
					</div>
					<div className="space-y-1.5 w-[150px]">
						<Label className="text-xs text-muted-foreground">结束日期</Label>
						<Input
							type="date"
							value={filters.dateTo}
							onChange={(e) =>
								setFilters((s) => ({ ...s, dateTo: e.target.value }))
							}
						/>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-9"
						onClick={resetFilters}
					>
						<RotateCcw className="size-4" />
						重置筛选
					</Button>
				</div>
			</div>

			<ScrollArea className="flex-1 rounded-md border">
				{items.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
						<Inbox className="size-10" />
						<p>{loading ? "加载中..." : "暂无通知"}</p>
					</div>
				) : (
					<ul className="divide-y">
						{items.map((item) => {
							const isUnread = !item.read_at
							const variant = LEVEL_VARIANT[item.level] ?? "secondary"
							const sourceLabel = SOURCE_LABEL[item.source] ?? item.source
							const levelLabel = LEVEL_LABEL[item.level] ?? item.level
							const payloadText = tryFormatPayload(item.payload)
							return (
								<li
									key={item.id}
									className={cn(
										"flex flex-col gap-2 px-4 py-3",
										isUnread && "bg-accent/30",
									)}
								>
									<div className="flex items-center gap-2 flex-wrap">
										<Badge variant="outline">{sourceLabel}</Badge>
										<Badge
											variant={variant}
											className={levelBadgeClassName(item.level)}
										>
											{levelLabel}
										</Badge>
										{item.event && (
											<Badge variant="outline-info" className="font-mono">
												{item.event}
											</Badge>
										)}
										<span
											className="text-xs text-muted-foreground ml-auto"
											title={formatAbsoluteTime(item.created_at)}
										>
											{formatRelativeTime(item.created_at)}
										</span>
										{isUnread && (
											<Button
												variant="ghost"
												size="sm"
												className="h-7 px-2 text-xs"
												onClick={() => handleMarkOne(item.id)}
											>
												标记已读
											</Button>
										)}
									</div>
									{item.title && (
										<div className="font-semibold">{item.title}</div>
									)}
									<div className="text-sm whitespace-pre-wrap break-words">
										{item.message}
									</div>
									{payloadText && (
										<details className="text-xs text-muted-foreground">
											<summary className="cursor-pointer select-none">
												展开 payload
											</summary>
											<pre className="mt-1 p-2 rounded bg-muted overflow-x-auto whitespace-pre">
												{payloadText}
											</pre>
										</details>
									)}
								</li>
							)
						})}
					</ul>
				)}
			</ScrollArea>
		</div>
	)
}
