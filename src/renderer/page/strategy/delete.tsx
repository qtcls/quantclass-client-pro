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
import { Checkbox } from "@/renderer/components/ui/checkbox"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { useStrategyManager } from "@/renderer/hooks/useStrategyManager"
import { DeleteIcon } from "@/renderer/icons/DeleteIcon"
import { cn } from "@/renderer/lib/utils"
import type { BaseStrategy } from "@/renderer/types"
import { useMutation } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface DeleteStrategyProps<T extends BaseStrategy> {
	strategy: T
	strategyType: "select" | "rotate"
	rowIndex: number
	className?: string
	onClick?: (e: React.MouseEvent) => boolean
	onSuccess: () => void
}

export function DeleteStrategy<T extends BaseStrategy>({
	strategy,
	rowIndex,
	onSuccess,
	className,
}: DeleteStrategyProps<T>) {
	const [showDialog, setShowDialog] = useState(false)
	const [confirmDelete, setConfirmDelete] = useState(false)
	const { removeSelectStg } = useStrategyManager()

	// 当用户确认之前，自动重置确认的声明
	useEffect(() => {
		setConfirmDelete(false)
	}, [showDialog])

	const doDelete = async () => {
		console.log("doDelete", rowIndex, strategy)
		try {
			removeSelectStg(rowIndex)
			toast.success(`策略 "${strategy.name}" 已删除`)
			onSuccess?.()
		} catch (error) {
			toast.error("删除失败")
			console.error(error)
		}
		setShowDialog(false)
	}

	const { mutateAsync: deleteStrategy, isPending: deleting } = useMutation({
		mutationKey: ["delete-strategy"],
		mutationFn: doDelete,
	})

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className={cn(
					"absolute top-2 right-2 h-8 w-8 hover:text-destructive-foreground",
					className,
				)}
				onClick={() => {
					setShowDialog(true)
				}}
			>
				<DeleteIcon className="h-4 w-4 stroke-destructive" />
			</Button>

			<Dialog open={showDialog} onOpenChange={setShowDialog}>
				<DialogContent className="p-4 max-w-md">
					<DialogHeader>
						<DialogTitle>确认删除</DialogTitle>
					</DialogHeader>
					<div className="space-y-2 leading-relaxed">
						<p>
							确定要删除策略{" "}
							<span className="font-bold">"{strategy.name}"</span> 吗？
							<span className="text-destructive">此操作不可撤销</span>。
						</p>
						<p>
							如果当前策略已经进入“交易计划”或正在下单中，无法阻断交易操作。
						</p>
						<div className="flex items-center gap-2 pt-2">
							<Checkbox
								checked={confirmDelete}
								autoFocus
								onCheckedChange={(value) => {
									setConfirmDelete(value === true)
								}}
							/>{" "}
							我已经充分了解风险，并且确认需要删除该策略
						</div>
					</div>
					<DialogFooter>
						<Button
							disabled={deleting}
							variant="outline"
							onClick={() => setShowDialog(false)}
						>
							取消
						</Button>
						<Button
							disabled={deleting || !confirmDelete}
							onClick={(e) => {
								e.stopPropagation()
								e.preventDefault()
								deleteStrategy()
							}}
						>
							{deleting ? "删除中..." : "确认删除"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
