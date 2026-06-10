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
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/renderer/components/ui/alert-dialog"
import { useEffect, useState } from "react"

const COUNTDOWN_SECONDS = 10

interface AcceleratedDataSourceConfirmDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: () => void
}

export function AcceleratedDataSourceConfirmDialog({
	open,
	onOpenChange,
	onConfirm,
}: AcceleratedDataSourceConfirmDialogProps) {
	const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)

	useEffect(() => {
		if (!open) {
			setCountdown(COUNTDOWN_SECONDS)
			return
		}

		setCountdown(COUNTDOWN_SECONDS)
		const timer = setInterval(() => {
			setCountdown((prev) => {
				if (prev <= 1) {
					clearInterval(timer)
					return 0
				}
				return prev - 1
			})
		}, 1000)

		return () => clearInterval(timer)
	}, [open])

	const isConfirmDisabled = countdown > 0

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>确认启用加速数据源</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="space-y-3 text-base leading-relaxed">
							<p className="font-medium text-foreground">
								加速数据源适用于因网络、电脑硬盘等原因，导致原始 QMT
								准确数据获取较慢的情况。
							</p>
							<ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
								<li>
									内置多个加速通道源，可在秒级完成拉取，缓解本地环境导致的获取延迟
								</li>
								<li>
									当网络不稳定、硬盘读写慢或 QMT 本地拉取耗时过长时，可优先尝试启用
								</li>
								<li>原始 QMT 数据准确性更高，建议作为最终参考依据</li>
								<li>启用后，内核将优先使用加速数据源获取分钟级数据</li>
							</ul>
							<p className="text-muted-foreground">
								加速源速度更快，但准确性不如原始 QMT。请确认您已了解上述差异，并愿意承担相应风险。
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>取消</AlertDialogCancel>
					<AlertDialogAction disabled={isConfirmDisabled} onClick={onConfirm}>
						{isConfirmDisabled ? `确认（${countdown}s）` : "确认"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
