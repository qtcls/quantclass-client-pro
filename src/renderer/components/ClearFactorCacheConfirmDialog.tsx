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

interface ClearFactorCacheConfirmDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: () => void | Promise<void>
}

export function ClearFactorCacheConfirmDialog({
	open,
	onOpenChange,
	onConfirm,
}: ClearFactorCacheConfirmDialogProps) {
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
			<AlertDialogContent className="max-w-lg">
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2 text-lg">
						<AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
						清除因子缓存
					</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="space-y-3 text-sm text-foreground leading-relaxed">
							<p>
								清除后，下次运行时会<strong>重新计算全部日内因子</strong>
								，初期计算耗时将明显增加（与清理编译缓存后需重新构建类似）。
							</p>
							<p>
								另一方面，可释放磁盘占用、排除异常缓存带来的结果偏差，并在计算逻辑更新后确保走新逻辑。
							</p>
							<p>
								如果不清楚该功能，请私信助教了解具体效果和可能存在的风险。
							</p>
							<p className="text-muted-foreground font-bold">
								请确认仍要删除数据目录下的「因子缓存」文件夹。
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
							? "处理中…"
							: canConfirm
								? "确认清除"
								: `请阅读说明（${countdown}s）`}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
