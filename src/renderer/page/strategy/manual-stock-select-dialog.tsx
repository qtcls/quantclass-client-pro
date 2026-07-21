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
import { Checkbox } from "@/renderer/components/ui/checkbox"
import DatePicker from "@/renderer/components/ui/date-picker"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { Input } from "@/renderer/components/ui/input"
import { Separator } from "@/renderer/components/ui/separator"
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/renderer/components/ui/tabs"
import { cn } from "@/renderer/lib/utils"
import {
	findFirstTradingDayIndexAfter,
	getLocalCalendarYmd,
	isLocalYmdTradingDayInCalendar,
} from "@/shared/lib/trading-day"
import type { ManualStockSelectResultItem } from "@/shared/types/manual-stock-select"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"
import { CalendarDays, FileText, ListPlus, Plus, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

dayjs.extend(customParseFormat)

const {
	getTradingDays,
	loadManualStockResult,
	saveManualStockResult,
	deleteManualStockReselectFlag,
} = window.electronAPI

interface ManualStockSelectDialogProps {
	strategyDisplayName: string
}

type EditMode = "visual" | "bulk"

function dateGroupsToItems(
	groups: DateStockGroup[],
): ManualStockSelectResultItem[] {
	const result: ManualStockSelectResultItem[] = []
	for (const group of groups) {
		if (!group.date) continue
		const ymd = getLocalCalendarYmd(group.date)
		if (group.stocks.length === 0) {
			result.push({ 选股日期: ymd, 股票代码: "" })
			continue
		}
		for (const code of group.stocks) {
			result.push({ 选股日期: ymd, 股票代码: code })
		}
	}
	return result.sort(
		(a, b) =>
			a.选股日期.localeCompare(b.选股日期) ||
			a.股票代码.localeCompare(b.股票代码),
	)
}

interface DateStockGroup {
	id: string
	date?: Date
	stocks: string[]
	draft: string
}

function createDateStockGroup(): DateStockGroup {
	return {
		id: crypto.randomUUID(),
		date: undefined,
		stocks: [],
		draft: "",
	}
}

function formatGroupDateLabel(date?: Date): string {
	if (!date) return "未选日期"
	return dayjs(date).format("MM-DD")
}

function formatGroupDateFull(date?: Date): string {
	if (!date) return "请选择交易日"
	return dayjs(date).format("YYYY-MM-DD")
}

function createInitialDateGroups(): DateStockGroup[] {
	return [createDateStockGroup()]
}

function resultItemsToDateGroups(
	items: ManualStockSelectResultItem[],
): DateStockGroup[] {
	if (items.length === 0) return createInitialDateGroups()

	const groupMap = new Map<string, string[]>()
	for (const item of items) {
		const ymd = item.选股日期
		if (!item.股票代码) {
			if (!groupMap.has(ymd)) {
				groupMap.set(ymd, [])
			}
			continue
		}
		const stocks = groupMap.get(ymd) ?? []
		if (!stocks.includes(item.股票代码)) {
			stocks.push(item.股票代码)
		}
		groupMap.set(ymd, stocks)
	}

	return Array.from(groupMap.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([ymd, stocks]) => ({
			id: crypto.randomUUID(),
			date: dayjs(ymd, "YYYY-MM-DD").toDate(),
			stocks,
			draft: "",
		}))
}

const BULK_LINE_RE = /^(\d{4}-\d{2}-\d{2})\s*,\s*(.*)$/

function itemsToBulkText(items: ManualStockSelectResultItem[]): string {
	return [...items]
		.sort(
			(a, b) =>
				a.选股日期.localeCompare(b.选股日期) ||
				a.股票代码.localeCompare(b.股票代码),
		)
		.map((item) => `${item.选股日期},${item.股票代码}`)
		.join("\n")
}

function parseBulkText(
	text: string,
	tradingDays: string[] = [],
):
	| { success: true; data: ManualStockSelectResultItem[] }
	| { success: false; message: string; line?: number } {
	const lines = text.split(/\r?\n/)
	const data: ManualStockSelectResultItem[] = []

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index].trim()
		if (!line) continue

		const lineNo = index + 1
		const match = BULK_LINE_RE.exec(line)
		if (!match) {
			return {
				success: false,
				message: `第 ${lineNo} 行格式错误，应为：YYYY-MM-DD,股票代码（股票代码可留空表示卖出全部）`,
				line: lineNo,
			}
		}

		const ymd = match[1]
		const code = match[2].trim()
		if (!dayjs(ymd, "YYYY-MM-DD", true).isValid()) {
			return {
				success: false,
				message: `第 ${lineNo} 行日期无效：${ymd}`,
				line: lineNo,
			}
		}
		if (
			tradingDays.length > 0 &&
			!isLocalYmdTradingDayInCalendar(tradingDays, ymd)
		) {
			return {
				success: false,
				message: `第 ${lineNo} 行不是交易日：${ymd}`,
				line: lineNo,
			}
		}

		data.push({ 选股日期: ymd, 股票代码: code })
	}

	if (data.length === 0) {
		return { success: false, message: "请至少输入一行有效数据" }
	}

	return { success: true, data }
}

function parseYmdToLocalDate(
	ymd: string,
	hour = 0,
	minute = 0,
	second = 0,
): Date | null {
	const parts = ymd.split("-").map(Number)
	const [y, m, d] = parts
	if (
		parts.length !== 3 ||
		Number.isNaN(y) ||
		Number.isNaN(m) ||
		Number.isNaN(d)
	) {
		return null
	}
	return new Date(y, m - 1, d, hour, minute, second, 0)
}

// -- 选股日期在「下一交易日 09:00（本地时间）」前仍可编辑；超过则不可编辑
function isManualStockSelectYmdEditable(
	sortedUniqueYmd: string[],
	selectionYmd: string,
	now: Date = new Date(),
): boolean {
	if (sortedUniqueYmd.length === 0) {
		return true
	}
	if (!isLocalYmdTradingDayInCalendar(sortedUniqueYmd, selectionYmd)) {
		return false
	}

	const nextIdx = findFirstTradingDayIndexAfter(sortedUniqueYmd, selectionYmd)
	if (nextIdx < 0) {
		return true
	}

	const deadline = parseYmdToLocalDate(sortedUniqueYmd[nextIdx], 9, 0, 0)
	if (!deadline) {
		return true
	}

	return now < deadline
}

function extractPersistedDateYmds(
	items: ManualStockSelectResultItem[],
): Set<string> {
	return new Set(items.map((item) => item.选股日期))
}

function getExpiredDateStockMap(
	items: ManualStockSelectResultItem[],
	tradingDays: string[],
): Map<string, Set<string>> {
	const map = new Map<string, Set<string>>()
	for (const item of items) {
		if (isManualStockSelectYmdEditable(tradingDays, item.选股日期)) continue
		const codes = map.get(item.选股日期) ?? new Set<string>()
		codes.add(item.股票代码)
		map.set(item.选股日期, codes)
	}
	return map
}

function assertExpiredDatesUnchanged(
	original: ManualStockSelectResultItem[],
	updated: ManualStockSelectResultItem[],
	tradingDays: string[],
): string | null {
	if (tradingDays.length === 0) return null

	const originalExpired = getExpiredDateStockMap(original, tradingDays)
	const updatedExpired = getExpiredDateStockMap(updated, tradingDays)

	for (const [ymd, oldCodes] of originalExpired) {
		const newCodes = updatedExpired.get(ymd)
		if (!newCodes || oldCodes.size !== newCodes.size) {
			return `选股日期 ${ymd} 已过编辑截止时间（下一交易日 09:00 后不可修改）`
		}
		for (const code of oldCodes) {
			if (!newCodes.has(code)) {
				return `选股日期 ${ymd} 已过编辑截止时间（下一交易日 09:00 后不可修改）`
			}
		}
	}

	for (const [ymd, newCodes] of updatedExpired) {
		if (!originalExpired.has(ymd)) {
			return `选股日期 ${ymd} 已过编辑截止时间（下一交易日 09:00 后不可修改）`
		}
		const oldCodes = originalExpired.get(ymd)!
		for (const code of newCodes) {
			if (!oldCodes.has(code)) {
				return `选股日期 ${ymd} 已过编辑截止时间（下一交易日 09:00 后不可修改）`
			}
		}
	}

	return null
}

type SaveMode = "normal" | "reselect"

export function ManualStockSelectDialog({
	strategyDisplayName,
}: ManualStockSelectDialogProps) {
	const [open, setOpen] = useState(false)
	const [dateGroups, setDateGroups] = useState<DateStockGroup[]>(
		createInitialDateGroups,
	)
	const [activeGroupId, setActiveGroupId] = useState<string>("")
	const [editMode, setEditMode] = useState<EditMode>("visual")
	const [bulkText, setBulkText] = useState("")
	const [persistedDateYmds, setPersistedDateYmds] = useState<Set<string>>(
		new Set(),
	)
	const [loadedItems, setLoadedItems] = useState<ManualStockSelectResultItem[]>(
		[],
	)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
	const [saveMode, setSaveMode] = useState<SaveMode>("normal")
	const [pendingSaveData, setPendingSaveData] = useState<
		ManualStockSelectResultItem[] | null
	>(null)

	const applyItemsToEditor = useCallback(
		(items: ManualStockSelectResultItem[]) => {
			const groups = resultItemsToDateGroups(items)
			setDateGroups(groups)
			setActiveGroupId(groups[0]?.id ?? "")
			setBulkText(itemsToBulkText(items))
		},
		[],
	)

	useEffect(() => {
		if (!open) return

		let cancelled = false

		const loadSavedResult = async () => {
			setIsLoading(true)
			try {
				const result = await loadManualStockResult(strategyDisplayName)
				if (cancelled) return

				if (!result.success) {
					toast.error(result.message ?? "读入选股结果失败")
				}

				const loadedItems = result.data ?? []
				setPersistedDateYmds(extractPersistedDateYmds(loadedItems))
				setLoadedItems(loadedItems)
				applyItemsToEditor(loadedItems)
			} catch {
				if (cancelled) return
				setPersistedDateYmds(new Set())
				setLoadedItems([])
				applyItemsToEditor([])
			} finally {
				if (!cancelled) setIsLoading(false)
			}
		}

		void loadSavedResult()

		return () => {
			cancelled = true
		}
	}, [open, strategyDisplayName, applyItemsToEditor])

	useEffect(() => {
		if (!activeGroupId && dateGroups[0]) {
			setActiveGroupId(dateGroups[0].id)
		}
	}, [activeGroupId, dateGroups])

	const activeGroup = useMemo(
		() => dateGroups.find((group) => group.id === activeGroupId),
		[activeGroupId, dateGroups],
	)

	const { data: tradingDays = [] } = useQuery({
		queryKey: ["trading-days"],
		queryFn: () => getTradingDays(),
		staleTime: 10 * 60 * 1000,
	})

	const isGroupEditExpired = useCallback(
		(group: DateStockGroup) => {
			if (!group.date || tradingDays.length === 0) return false
			const ymd = getLocalCalendarYmd(group.date)
			return !isManualStockSelectYmdEditable(tradingDays, ymd)
		},
		[tradingDays],
	)

	const isDateLocked = useCallback(
		(group: DateStockGroup) => {
			if (!group.date) return false
			if (isGroupEditExpired(group)) return true
			return persistedDateYmds.has(getLocalCalendarYmd(group.date))
		},
		[persistedDateYmds, isGroupEditExpired],
	)

	const updateGroup = useCallback(
		(id: string, patch: Partial<DateStockGroup>) => {
			setDateGroups((prev) =>
				prev.map((group) => {
					if (group.id !== id) return group
					if (isGroupEditExpired(group)) {
						toast.error(
							"该选股日期已过编辑截止时间（下一交易日 09:00 后不可修改）",
						)
						return group
					}
					if (patch.date !== undefined && isDateLocked(group)) {
						toast.error("该选股日期已保存至文件，不可修改，请删除后重新添加")
						return group
					}
					return { ...group, ...patch }
				}),
			)
		},
		[isDateLocked, isGroupEditExpired],
	)

	const isNonTradingDay = useCallback(
		(date: Date, groupId: string) => {
			const ymd = getLocalCalendarYmd(date)
			if (!isLocalYmdTradingDayInCalendar(tradingDays, ymd)) {
				return true
			}
			if (
				tradingDays.length > 0 &&
				!isManualStockSelectYmdEditable(tradingDays, ymd)
			) {
				return true
			}
			return dateGroups.some(
				(group) =>
					group.id !== groupId &&
					group.date &&
					getLocalCalendarYmd(group.date) === ymd,
			)
		},
		[dateGroups, tradingDays],
	)

	const addStockToGroup = (group: DateStockGroup) => {
		if (isGroupEditExpired(group)) {
			toast.error("该选股日期已过编辑截止时间（下一交易日 09:00 后不可修改）")
			return
		}
		const code = group.draft.trim()
		if (!code) {
			toast.error("请输入股票代码")
			return
		}
		if (group.stocks.includes(code)) {
			toast.error("该日期下已存在相同股票代码")
			return
		}
		updateGroup(group.id, {
			stocks: [...group.stocks, code],
			draft: "",
		})
	}

	const removeStockFromGroup = (groupId: string, code: string) => {
		const group = dateGroups.find((item) => item.id === groupId)
		if (group && isGroupEditExpired(group)) {
			toast.error("该选股日期已过编辑截止时间（下一交易日 09:00 后不可修改）")
			return
		}
		setDateGroups((prev) =>
			prev.map((group) =>
				group.id === groupId
					? { ...group, stocks: group.stocks.filter((s) => s !== code) }
					: group,
			),
		)
	}

	const addDateGroup = () => {
		const next = createDateStockGroup()
		setDateGroups((prev) => [...prev, next])
		setActiveGroupId(next.id)
	}

	const removeDateGroup = (groupId: string) => {
		const group = dateGroups.find((item) => item.id === groupId)
		if (group && isGroupEditExpired(group)) {
			toast.error("该选股日期已过编辑截止时间（下一交易日 09:00 后不可修改）")
			return
		}
		setDateGroups((prev) => {
			if (prev.length <= 1) return prev
			const index = prev.findIndex((group) => group.id === groupId)
			const next = prev.filter((group) => group.id !== groupId)
			if (activeGroupId === groupId) {
				const fallback = next[Math.min(index, next.length - 1)]
				if (fallback) setActiveGroupId(fallback.id)
			}
			return next
		})
	}

	const buildResultData = (): ManualStockSelectResultItem[] | null => {
		let result: ManualStockSelectResultItem[] | null = null

		if (editMode === "bulk") {
			const parsed = parseBulkText(bulkText, tradingDays)
			if (!parsed.success) {
				toast.error(parsed.message ?? "批量文本格式错误")
				return null
			}
			result = parsed.data ?? null
		} else {
			const visualResult: ManualStockSelectResultItem[] = []

			for (const group of dateGroups) {
				const hasDate = Boolean(group.date)
				const hasStocks = group.stocks.length > 0

				if (!hasDate && !hasStocks) continue

				if (!hasDate) {
					toast.error("请为已添加股票的条目选择选股日期")
					return null
				}

				const ymd = getLocalCalendarYmd(group.date!)
				if (!hasStocks) {
					visualResult.push({ 选股日期: ymd, 股票代码: "" })
					continue
				}
				for (const code of group.stocks) {
					visualResult.push({ 选股日期: ymd, 股票代码: code })
				}
			}

			if (visualResult.length === 0) {
				toast.error("请至少添加一个选股日期")
				return null
			}

			result = visualResult
		}

		if (!result) return null

		const expiredError = assertExpiredDatesUnchanged(
			loadedItems,
			result,
			tradingDays,
		)
		if (expiredError) {
			toast.error(expiredError)
			return null
		}

		return result
	}

	const persistSavedResult = useCallback(
		(data: ManualStockSelectResultItem[]) => {
			applyItemsToEditor(data)
			setPersistedDateYmds(extractPersistedDateYmds(data))
			setLoadedItems(data)
		},
		[applyItemsToEditor],
	)

	const saveResultData = async (
		data: ManualStockSelectResultItem[],
	): Promise<boolean> => {
		const result = await saveManualStockResult(strategyDisplayName, data)
		if (!result.success) {
			toast.error(result.message ?? "保存失败，请重试")
			return false
		}
		return true
	}

	const handleConfirm = () => {
		const data = buildResultData()
		if (!data) return
		setPendingSaveData(data)
		setSaveMode("normal")
		setSaveConfirmOpen(true)
	}

	const handleSaveConfirmOpenChange = (value: boolean) => {
		if (isSubmitting) return
		setSaveConfirmOpen(value)
		if (!value) {
			setPendingSaveData(null)
			setSaveMode("normal")
		}
	}

	const handleSaveConfirm = async () => {
		if (!pendingSaveData) return

		const data = pendingSaveData
		const uniqueDates = new Set(data.map((item) => item.选股日期)).size
		const shouldReselect = saveMode === "reselect"

		setIsSubmitting(true)
		try {
			const saved = await saveResultData(data)
			if (!saved) return

			if (shouldReselect) {
				const deleteResult = await deleteManualStockReselectFlag()
				if (!deleteResult.success) {
					toast.error(deleteResult.message ?? "立即重新选股失败")
					persistSavedResult(data)
					return
				}
				toast.success(
					`手工选股结果已保存，共 ${uniqueDates} 个日期、${data.length} 只股票；已触发重新选股`,
				)
			} else {
				toast.success(
					`手工选股结果已保存，共 ${uniqueDates} 个日期、${data.length} 只股票`,
				)
			}

			persistSavedResult(data)
			setSaveConfirmOpen(false)
			setPendingSaveData(null)
			setSaveMode("normal")
			setOpen(false)
		} catch {
			toast.error("保存失败，请重试")
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleOpenChange = (value: boolean) => {
		if (!value) {
			if (isSubmitting) return
			setEditMode("visual")
			setPersistedDateYmds(new Set())
			setLoadedItems([])
			setSaveConfirmOpen(false)
			setPendingSaveData(null)
			setSaveMode("normal")
		}
		setOpen(value)
	}

	const handleEditModeChange = (mode: EditMode) => {
		if (mode === editMode) return

		if (mode === "bulk") {
			setBulkText(itemsToBulkText(dateGroupsToItems(dateGroups)))
			setEditMode("bulk")
			return
		}

		if (!bulkText.trim()) {
			applyItemsToEditor([])
			setEditMode("visual")
			return
		}

		const parsed = parseBulkText(bulkText, tradingDays)
		if (!parsed.success) {
			toast.error(parsed.message ?? "批量文本格式错误，无法切换到图形编辑")
			return
		}
		const expiredError = assertExpiredDatesUnchanged(
			loadedItems,
			parsed.data ?? [],
			tradingDays,
		)
		if (expiredError) {
			toast.error(expiredError)
			return
		}
		applyItemsToEditor(parsed.data ?? [])
		setEditMode("visual")
	}

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className="h-8 w-8"
				onClick={(e) => {
					e.stopPropagation()
					setOpen(true)
				}}
				title="手工选股"
			>
				<ListPlus className="h-4 w-4" />
			</Button>

			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
					<div className="shrink-0 space-y-3 px-6 pb-4 pt-6">
						<DialogHeader className="space-y-1.5 text-left">
							<DialogTitle className="flex items-center gap-2">
								<ListPlus className="size-5" />
								<span>手工选股</span>
							</DialogTitle>
						</DialogHeader>

						<div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
							<span className="text-muted-foreground">策略：</span>
							<span className="font-medium">{strategyDisplayName}</span>
						</div>

						{tradingDays.length === 0 && (
							<p className="text-xs text-warning-600">
								交易日历加载中或未配置，日期过滤暂不可用
							</p>
						)}
					</div>

					<Separator />

					<Tabs
						value={editMode}
						onValueChange={(value) => handleEditModeChange(value as EditMode)}
						className="flex min-h-0 flex-1 flex-col"
					>
						<div className="shrink-0 px-6 pt-4">
							<TabsList className="grid w-full max-w-sm grid-cols-2">
								<TabsTrigger value="visual" className="gap-1.5">
									<CalendarDays className="size-3.5" />
									图形编辑
								</TabsTrigger>
								<TabsTrigger value="bulk" className="gap-1.5">
									<FileText className="size-3.5" />
									批量编辑
								</TabsTrigger>
							</TabsList>
						</div>

						<TabsContent
							value="visual"
							className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
						>
							<div className="shrink-0 space-y-2 px-6 py-4">
								<div className="flex items-center justify-between gap-2">
									<p className="text-sm font-medium">选股日期</p>
								</div>

								<div className="overflow-x-auto pb-1">
									<div className="flex min-w-min items-stretch gap-2">
										{dateGroups.map((group) => {
											const isActive = group.id === activeGroupId
											const isExpired = isGroupEditExpired(group)
											return (
												<div
													key={group.id}
													className={cn(
														"relative flex min-w-[132px] shrink-0 flex-col rounded-lg border transition-colors",
														isActive
															? "border-primary bg-primary/5 shadow-sm"
															: "border-border bg-card hover:bg-muted/40",
													)}
												>
													<button
														type="button"
														className="flex flex-1 flex-col items-start gap-1 px-3 py-2 text-left"
														onClick={() => setActiveGroupId(group.id)}
													>
														<span
															className={cn(
																"text-sm font-semibold tabular-nums",
																!group.date && "text-muted-foreground",
															)}
														>
															{formatGroupDateLabel(group.date)}
														</span>
														<span className="text-[11px] text-muted-foreground">
															{group.date
																? dayjs(group.date).format("YYYY")
																: "待选择"}
														</span>
														<Badge
															variant={
																group.stocks.length > 0
																	? "default"
																	: "secondary"
															}
															className="mt-1 h-5 px-1.5 text-[10px]"
														>
															{group.stocks.length} 只
														</Badge>
													</button>

													{dateGroups.length > 1 && !isExpired && (
														<button
															type="button"
															className="absolute right-1 top-1 rounded-sm p-0.5 text-muted-foreground hover:bg-background hover:text-destructive"
															onClick={(e) => {
																e.stopPropagation()
																removeDateGroup(group.id)
															}}
															title="删除该日期"
														>
															<X className="h-3 w-3" />
														</button>
													)}
												</div>
											)
										})}

										<button
											type="button"
											onClick={addDateGroup}
											className="flex min-w-[96px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 py-2 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
										>
											<Plus className="h-4 w-4" />
											<span className="text-xs">添加日期</span>
										</button>
									</div>
								</div>
							</div>

							<Separator />

							<div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
								{isLoading ? (
									<p className="py-8 text-center text-sm text-muted-foreground">
										加载已有选股结果...
									</p>
								) : activeGroup ? (
									<div className="space-y-4">
										<div className="flex items-center justify-between gap-3">
											<div>
												<p className="text-sm font-medium">
													当前编辑：{formatGroupDateFull(activeGroup.date)}
												</p>
												<p className="text-xs text-muted-foreground">
													{isGroupEditExpired(activeGroup)
														? "该日期已过编辑截止时间（下一交易日 09:00 后不可修改）"
														: "为该交易日添加股票代码"}
												</p>
											</div>
										</div>

										<div className="space-y-2">
											<p className="flex items-center gap-1.5 text-sm font-medium">
												<CalendarDays className="h-4 w-4 text-muted-foreground" />
												{isDateLocked(activeGroup) ? "选股日期" : "选择日期"}
											</p>
											{isDateLocked(activeGroup) ? (
												<div className="flex h-9 w-full max-w-xs items-center rounded-md border bg-muted/30 px-3 text-sm tabular-nums">
													{formatGroupDateFull(activeGroup.date)}
												</div>
											) : (
												<DatePicker
													value={activeGroup.date}
													onChange={(date) =>
														updateGroup(activeGroup.id, { date })
													}
													disabledDate={(date) =>
														isNonTradingDay(date, activeGroup.id)
													}
													className="w-full max-w-xs"
												/>
											)}
										</div>

										<div className="space-y-2">
											<p className="text-sm font-medium">
												股票列表（{activeGroup.stocks.length}）
											</p>

											<div className="min-h-[140px] rounded-md border border-dashed bg-muted/20 p-3">
												{activeGroup.stocks.length > 0 ? (
													<div className="flex flex-wrap gap-2">
														{activeGroup.stocks.map((code) => (
															<span
																key={code}
																className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-mono"
															>
																{code}
																{!isGroupEditExpired(activeGroup) && (
																	<button
																		type="button"
																		className="rounded-sm text-muted-foreground hover:text-foreground"
																		onClick={() =>
																			removeStockFromGroup(activeGroup.id, code)
																		}
																		title="移除"
																	>
																		<X className="h-3 w-3" />
																	</button>
																)}
															</span>
														))}
													</div>
												) : (
													<p className="py-4 text-center text-xs text-muted-foreground">
														该日期暂无股票，保存后将卖出全部持仓；也可在下方输入代码后点击
														+ 添加
													</p>
												)}
											</div>

											<div className="flex items-center gap-2">
												<Input
													value={activeGroup.draft}
													onChange={(e) =>
														updateGroup(activeGroup.id, {
															draft: e.target.value,
														})
													}
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															e.preventDefault()
															addStockToGroup(activeGroup)
														}
													}}
													placeholder="输入股票代码，如 sz000711"
													className="font-mono"
													disabled={isGroupEditExpired(activeGroup)}
												/>
												<Button
													type="button"
													variant="secondary"
													size="icon"
													className="shrink-0"
													onClick={() => addStockToGroup(activeGroup)}
													title="添加股票"
													disabled={isGroupEditExpired(activeGroup)}
												>
													<Plus className="h-4 w-4" />
												</Button>
											</div>
										</div>
									</div>
								) : (
									<p className="py-8 text-center text-sm text-muted-foreground">
										请先添加选股日期
									</p>
								)}
							</div>
						</TabsContent>

						<TabsContent
							value="bulk"
							className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4 data-[state=inactive]:hidden"
						>
							<div className="space-y-4">
								<div className="rounded-md border bg-muted/30 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
									<p className="mb-2 font-medium text-foreground">
										批量编辑格式说明
									</p>
									<ul className="list-disc space-y-1 pl-4">
										<li>每行一条记录，格式：选股日期,股票代码</li>
										<li>选股日期使用 YYYY-MM-DD，例如 2026-07-10</li>
										<li>股票代码例如 sz000001、sh600000</li>
										<li>
											股票代码留空（如 2026-07-21,）表示该日卖出全部持仓
										</li>
										<li>一行对应 JSON 文件中的一条记录</li>
										<li>空行会自动忽略</li>
										<li>选股日期在下一交易日 09:00 后不可再修改</li>
										<li>确认保存后将完全覆盖当前策略的手工选股结果</li>
									</ul>
									<p className="mt-3 text-foreground">样例：</p>
									<pre className="mt-1 overflow-x-auto rounded-md bg-background/80 p-2 font-mono text-[11px] text-foreground">
										{
											"2026-07-10,sz000001\n2026-07-10,sz000002\n2026-07-13,sz000006\n2026-07-21,"
										}
									</pre>
								</div>

								<div className="space-y-2">
									<p className="text-sm font-medium">批量输入</p>
									<textarea
										value={bulkText}
										onChange={(e) => setBulkText(e.target.value)}
										placeholder="每行一条：2026-07-10,sz000001"
										className={cn(
											"min-h-[420px] w-full resize-y rounded-md border bg-background px-3 py-2",
											"font-mono text-sm leading-6 shadow-sm",
											"placeholder:text-muted-foreground",
											"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
										)}
										spellCheck={false}
									/>
								</div>
							</div>
						</TabsContent>
					</Tabs>

					<DialogFooter className="shrink-0 border-t px-6 py-4 sm:justify-end">
						<Button
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={isSubmitting || isLoading}
						>
							取消
						</Button>
						<Button
							onClick={handleConfirm}
							disabled={isSubmitting || isLoading}
						>
							保存
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={saveConfirmOpen} onOpenChange={handleSaveConfirmOpenChange}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>确认保存</DialogTitle>
						<DialogDescription>
							确认保存当前手工选股结果？保存后将完全覆盖当前策略的手工选股结果。
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-2">
						<div className="flex items-start gap-3 rounded-md border p-3">
							<Checkbox
								id="manual-stock-save-normal"
								checked={saveMode === "normal"}
								onCheckedChange={(checked) => {
									if (checked === true) setSaveMode("normal")
								}}
								disabled={isSubmitting}
								className="mt-0.5"
							/>
							<label
								htmlFor="manual-stock-save-normal"
								className="cursor-pointer space-y-1"
							>
								<span className="block text-sm font-medium leading-none">
									保存
								</span>
								<span className="block text-xs leading-relaxed text-muted-foreground">
									保存当前手工选股结果，不会立即触发【重新选股】
								</span>
							</label>
						</div>

						<div className="flex items-start gap-3 rounded-md border p-3">
							<Checkbox
								id="manual-stock-save-reselect"
								checked={saveMode === "reselect"}
								onCheckedChange={(checked) => {
									if (checked === true) setSaveMode("reselect")
								}}
								disabled={isSubmitting}
								className="mt-0.5"
							/>
							<label
								htmlFor="manual-stock-save-reselect"
								className="cursor-pointer space-y-1"
							>
								<span className="block text-sm font-medium leading-none">
									保存并立即重新选股
								</span>
								<span className="block text-xs leading-relaxed text-muted-foreground">
									会立即触发【重新选股】，需手动启动【自动实盘】后才可触发【重新选股】，可能导致选股结果及后续交易计划发生变化。
								</span>
							</label>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => handleSaveConfirmOpenChange(false)}
							disabled={isSubmitting}
						>
							取消
						</Button>
						<Button onClick={handleSaveConfirm} disabled={isSubmitting}>
							{isSubmitting
								? "保存中..."
								: saveMode === "reselect"
									? "确认保存并重新选股"
									: "确认保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
