/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { AlertTriangle } from "lucide-react"
import { useEffect, useState } from "react"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "./ui/alert-dialog"

interface DataPathChangeDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	currentPath: string
	onConfirm: () => void
	onCancel: () => void
}

export function DataPathChangeDialog({
	open,
	onOpenChange,
	currentPath,
	onConfirm,
	onCancel,
}: DataPathChangeDialogProps) {
	const [countdown, setCountdown] = useState(15)
	const [canConfirm, setCanConfirm] = useState(false)

	// 15秒倒计时
	useEffect(() => {
		if (!open) {
			setCountdown(15)
			setCanConfirm(false)
			return undefined
		}

		if (countdown > 0) {
			const timer = setTimeout(() => {
				setCountdown(countdown - 1)
			}, 1000)
			return () => clearTimeout(timer)
		}

		if (countdown === 0) {
			setCanConfirm(true)
		}

		return undefined
	}, [open, countdown])

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="max-w-2xl">
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2 text-xl">
						<AlertTriangle className="h-6 w-6 text-amber-500" />
						数据存储路径更改警告
					</AlertDialogTitle>
					<AlertDialogDescription className="space-y-4 text-base">
						<div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
							<p className="text-amber-900 dark:text-amber-100 font-medium mb-2">
								请仔细阅读以下重要说明
							</p>
							<p className="text-amber-800 dark:text-amber-200">
								修改数据存储路径是一个敏感操作，需要谨慎处理。
							</p>
						</div>

						<div className="space-y-3 text-foreground">
							<div className="bg-muted rounded-lg p-4 space-y-2">
								<p className="font-semibold text-sm">当前路径：</p>
								<p className="text-sm font-mono break-all bg-background px-3 py-2 rounded border">
									{currentPath}
								</p>
							</div>
						</div>

						<div className="space-y-3 text-sm">
							<div className="flex gap-3">
								<div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold">
									1
								</div>
								<p className="flex-1 pt-0.5">
									应用将
									<strong className="text-foreground">
										修改数据存储路径指向
									</strong>
									，后续所有数据操作将使用新路径。
								</p>
							</div>

							<div className="flex gap-3">
								<div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold">
									2
								</div>
								<p className="flex-1 pt-0.5">
									原路径下的
									<strong className="text-foreground">
										所有数据和文件将保留
									</strong>
									，不会被删除或清除。
								</p>
							</div>

							<div className="flex gap-3">
								<div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold">
									3
								</div>
								<p className="flex-1 pt-0.5">
									新路径下可能
									<strong className="text-foreground">没有任何数据</strong>
									，您可能需要手动迁移数据。
								</p>
							</div>

							<div className="flex gap-3">
								<div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold">
									4
								</div>
								<p className="flex-1 pt-0.5">
									更改路径后，
									<strong className="text-foreground">数据订阅将被清空</strong>
									，需要重新配置。
								</p>
							</div>
						</div>

						<div className="bg-muted rounded-lg p-4 text-xs text-muted-foreground border-l-4 border-blue-500">
							<p className="font-medium text-foreground mb-1">提示</p>
							<p>
								如需保留原有数据，请在确认前手动将原路径下的文件复制到新路径。
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="flex-col sm:flex-row gap-2">
					<AlertDialogCancel onClick={onCancel}>取消</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						disabled={!canConfirm}
						className="bg-amber-600 hover:bg-amber-700 text-white"
					>
						{canConfirm ? (
							"确认更改"
						) : (
							<span className="flex items-center gap-2">
								请阅读说明 ({countdown}s)
							</span>
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
