/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { Button } from "@/renderer/components/ui/button"
import ButtonTooltip from "@/renderer/components/ui/button-tooltip"
import { Checkbox } from "@/renderer/components/ui/checkbox"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { useAlertDialog } from "@/renderer/context/alert-dialog"
import { useDataSubscribed } from "@/renderer/hooks/useDataSubscribed"
import { cn } from "@/renderer/lib/utils"
import { Archive, Inbox, RotateCcw, Trash2 } from "lucide-react"
import type { DataRecycleBinEntry } from "@/shared/types/data-recycle-bin"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

const { getDataRecycleBin, removeDataRecycleBinItems, purgeDataRecycleBinItems } =
	window.electronAPI

function pruneSelection(
	items: DataRecycleBinEntry[],
	prev: Set<string>,
): Set<string> {
	const itemSet = new Set(items.map((item) => item.name))
	const next = new Set<string>()
	for (const name of prev) {
		if (itemSet.has(name)) next.add(name)
	}
	return next
}

interface DataRecycleBinContentProps {
	onCountChange?: (count: number) => void
}

function DataRecycleBinContent({ onCountChange }: DataRecycleBinContentProps) {
	const [items, setItems] = useState<DataRecycleBinEntry[]>([])
	const [selected, setSelected] = useState<Set<string>>(() => new Set())
	const [loading, setLoading] = useState(true)
	const [acting, setActing] = useState(false)
	const { open: openAlert } = useAlertDialog()
	const { appendDataSubscribedFromRecycleBin } = useDataSubscribed()

	const selectedNames = useMemo(() => Array.from(selected), [selected])
	const selectedCount = selected.size
	const allSelected = items.length > 0 && selectedCount === items.length
	const someSelected = selectedCount > 0 && !allSelected
	const isEmpty = !loading && items.length === 0

	const refresh = useCallback(async () => {
		setLoading(true)
		try {
			const list = await getDataRecycleBin()
			setItems(list)
			setSelected((prev) => pruneSelection(list, prev))
			onCountChange?.(list.length)
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "加载回收站失败")
		} finally {
			setLoading(false)
		}
	}, [onCountChange])

	useEffect(() => {
		void refresh()
	}, [refresh])

	function toggleSelectAll(checked: boolean) {
		setSelected(
			checked ? new Set(items.map((item) => item.name)) : new Set(),
		)
	}

	function toggleSelectOne(name: string, checked: boolean) {
		setSelected((prev) => {
			const next = new Set(prev)
			if (checked) next.add(name)
			else next.delete(name)
			return next
		})
	}

	async function handleRestoreSelected() {
		if (selectedCount === 0) return
		setActing(true)
		try {
			const appendResult =
				await appendDataSubscribedFromRecycleBin(selectedNames)
			if (!appendResult.ok) {
				toast.error(appendResult.error ?? "恢复失败")
				return
			}
			const removeResult = await removeDataRecycleBinItems(selectedNames)
			if (!removeResult.ok) {
				toast.error(removeResult.error ?? "从回收站移除失败")
				return
			}
			if (appendResult.skipped.length > 0) {
				toast.warning(
					`${appendResult.skipped.length} 项未在数据目录中找到，已跳过：${appendResult.skipped.slice(0, 3).join("、")}${appendResult.skipped.length > 3 ? "…" : ""}`,
				)
			}
			if (appendResult.restored > 0) {
				toast.success(
					`已恢复 ${appendResult.restored} 项到白名单与 data_map`,
				)
			} else if (appendResult.skipped.length === 0) {
				toast.success("所选项目已在订阅中")
			}
			await refresh()
		} finally {
			setActing(false)
		}
	}

	function handlePurgeSelected() {
		if (selectedCount === 0) return
		openAlert({
			title: "彻底删除本地数据？",
			content: null,
			description: `将永久删除已选的 ${selectedCount} 个数据产品的磁盘文件夹与数据库记录，无法恢复。`,
			okText: "确认删除",
			cancelText: "取消",
			onOk: async () => {
				setActing(true)
				try {
					const r = await purgeDataRecycleBinItems(selectedNames)
					if (!r.ok) {
						toast.error(r.error ?? "删除失败")
						return
					}
					toast.success(`已彻底删除 ${selectedCount} 项本地数据`)
					await refresh()
				} finally {
					setActing(false)
				}
			},
		})
	}

	return (
		<div className="space-y-3">
			{loading ? (
				<p className="text-sm text-muted-foreground py-4 text-center">
					加载中…
				</p>
			) : isEmpty ? (
				<div
					className="flex items-center justify-center py-16 text-muted-foreground"
					role="img"
					aria-label="当前回收站为空"
				>
					<Inbox className="size-12 stroke-[1.25]" />
				</div>
			) : (
				<>
					<div className="flex items-center gap-2 border-b pb-2">
						<Checkbox
							id="recycle-bin-select-all"
							checked={
								allSelected ? true : someSelected ? "indeterminate" : false
							}
							disabled={acting}
							onCheckedChange={(value) => toggleSelectAll(value === true)}
							aria-label="全选"
						/>
						<label
							htmlFor="recycle-bin-select-all"
							className="text-xs text-muted-foreground cursor-pointer select-none"
						>
							全选
							{selectedCount > 0 && (
								<span className="text-foreground font-medium ml-1">
									（已选 {selectedCount} / {items.length}）
								</span>
							)}
						</label>
					</div>

					<div className="max-h-[min(50vh,320px)] overflow-y-auto space-y-1 pr-1">
						{items.map((item) => {
							const { name, displayName } = item
							const isChecked = selected.has(name)
							const showCode = displayName !== name
							return (
								<div
									key={name}
									className={cn(
										"flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60",
										isChecked && "bg-muted/80",
									)}
								>
									<Checkbox
										id={`recycle-bin-${name}`}
										checked={isChecked}
										disabled={acting}
										onCheckedChange={(value) =>
											toggleSelectOne(name, value === true)
										}
										aria-label={`选择 ${displayName}`}
									/>
									<label
										htmlFor={`recycle-bin-${name}`}
										className="flex-1 min-w-0 cursor-pointer select-none"
									>
										<span className="text-sm">{displayName}</span>
										{showCode ? (
											<code className="block text-xs font-mono text-muted-foreground break-all mt-0.5">
												{name}
											</code>
										) : null}
									</label>
								</div>
							)
						})}
					</div>

					<div className="flex flex-wrap gap-2 pt-1">
						<Button
							size="sm"
							variant="outline"
							disabled={acting || selectedCount === 0}
							onClick={() => void handleRestoreSelected()}
						>
							<RotateCcw className="size-3.5 mr-1" />
							恢复订阅（{selectedCount} 项）
						</Button>
						<Button
							size="sm"
							variant="destructive"
							disabled={acting || selectedCount === 0}
							onClick={handlePurgeSelected}
						>
							<Trash2 className="size-3.5 mr-1" />
							彻底删除（{selectedCount} 项）
						</Button>
					</div>
				</>
			)}
		</div>
	)
}

/** 垃圾桶入口（数量气泡）+ 回收站对话框 */
export function DataRecycleBinDialog() {
	const [open, setOpen] = useState(false)
	const [count, setCount] = useState(0)

	const refreshCount = useCallback(async () => {
		try {
			const list = await getDataRecycleBin()
			setCount(list.length)
		} catch {
			setCount(0)
		}
	}, [])

	useEffect(() => {
		void refreshCount()
	}, [refreshCount])

	function handleOpenChange(next: boolean) {
		setOpen(next)
		if (!next) void refreshCount()
	}

	const badgeLabel = count > 99 ? "99+" : String(count)

	return (
		<>
			<ButtonTooltip content="数据回收站" delayDuration={10}>
				<Button
					size="sm"
					variant="outline"
					className="relative h-10 w-10 shrink-0 p-0"
					aria-label="数据回收站"
					onClick={() => setOpen(true)}
				>
					<Trash2 size={16} />
					{count > 0 ? (
						<span
							className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
							aria-hidden
						>
							{badgeLabel}
						</span>
					) : null}
				</Button>
			</ButtonTooltip>

			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent className="max-w-lg gap-4">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-base">
							<Archive className="size-5 text-amber-600 dark:text-amber-400" />
							数据回收站
							<span className="text-sm font-normal text-muted-foreground">
								（{count} 项）
							</span>
						</DialogTitle>
						<DialogDescription className="text-xs leading-relaxed">
							本地有数据文件与数据库记录、但未出现在订阅白名单中的产品会出现在此处（常见于取消订阅后的软删除，或换机迁移后配置未同步）。请勾选后恢复订阅信息，或彻底删除本地数据。
						</DialogDescription>
					</DialogHeader>
					{open ? <DataRecycleBinContent onCountChange={setCount} /> : null}
				</DialogContent>
			</Dialog>
		</>
	)
}
