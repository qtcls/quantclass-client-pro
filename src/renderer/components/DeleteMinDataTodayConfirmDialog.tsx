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
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/renderer/components/ui/alert-dialog"
import { Button } from "@/renderer/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { useEffect, useState } from "react"

const COUNTDOWN_SEC = 5

interface DeleteMinDataTodayConfirmDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: () => void | Promise<void>
}

export function DeleteMinDataTodayConfirmDialog({
	open,
	onOpenChange,
	onConfirm,
}: DeleteMinDataTodayConfirmDialogProps) {
	const [countdown, setCountdown] = useState(COUNTDOWN_SEC)
	const [canConfirm, setCanConfirm] = useState(false)
	const [pending, setPending] = useState(false)

	useEffect(() => {
		if (!open) {
			setCountdown(COUNTDOWN_SEC)
			setCanConfirm(false)
			setPending(false)
			return undefined
		}

		if (countdown > 0) {
			const timer = setTimeout(() => {
				setCountdown((c) => c - 1)
			}, 1000)
			return () => clearTimeout(timer)
		}

		if (countdown === 0) {
			setCanConfirm(true)
		}

		return undefined
	}, [open, countdown])

	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				if (!next && pending) return
				onOpenChange(next)
			}}
		>
			<AlertDialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2 text-lg">
						<AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
						危险操作：确认删除今日实时数据
					</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="space-y-3 text-sm text-foreground leading-relaxed">
							<p>你即将删除以下数据库表：</p>
							<p className="font-medium">min_data、min_data_update_task</p>
							<div>
								<p className="font-medium">删除后将产生以下影响：</p>
								<ul className="mt-2 list-disc list-inside space-y-1.5 text-muted-foreground">
									<li>
										min_data 中的 QMT
										分钟行情数据（含个股与 ETF）会被永久删除，盘中择时、override
										调仓信号、个股小时择时将无法正常读取当日分钟行情。
									</li>
									<li>
										min_data_update_task
										中的分钟数据更新任务状态（含个股与 ETF）会被永久删除，系统将无法准确判断指定分钟数据是否已经采集完成。
									</li>
									<li>
										依赖盘中分钟数据的信号计算可能被跳过、延迟，或退化为不完整的数据检查逻辑。
									</li>
									<li>
										当天实盘交易计划、临时调仓计划、个股择时计划可能无法及时生成或更新。
									</li>
									<li>
										删除操作不可撤销，除非你已经提前备份数据库；后续恢复可能需要重新采集
										QMT 分钟数据并重建任务状态。
									</li>
								</ul>
							</div>
							<p>
								请确认你已经理解该操作会影响盘中实盘择时与交易计划生成，并已完成必要备份。
							</p>
							<p className="text-muted-foreground font-bold">
								确认删除后，此操作不可撤销。
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="flex-col sm:flex-row gap-2">
					<AlertDialogCancel disabled={pending}>取消</AlertDialogCancel>
					<Button
						disabled={!canConfirm || pending}
						variant="destructive"
						onClick={async () => {
							setPending(true)
							try {
								await onConfirm()
							} finally {
								setPending(false)
							}
						}}
					>
						{pending
							? "删除中…"
							: canConfirm
								? "确认删除"
								: `请阅读说明（${countdown}s）`}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
