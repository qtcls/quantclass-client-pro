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

interface MinDataExecConfirmDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: () => void
	enableEtfMinData?: boolean
}

export function MinDataExecConfirmDialog({
	open,
	onOpenChange,
	onConfirm,
	enableEtfMinData = false,
}: MinDataExecConfirmDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>确认手动执行</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="space-y-3 text-base leading-relaxed">
							<p className="font-medium text-foreground">
								即将手动获取准确 QMT 数据
							</p>
							<ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
								<li>将拉取 5 分钟准确 QMT 数据（个股）</li>
								{enableEtfMinData && <li>将同时拉取 ETF 5 分钟精确数据</li>}
								<li>极速模式约需 1 分钟，稳定模式约需 3 分钟</li>
							</ul>
							<p className="text-muted-foreground">确定要现在执行吗？</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>取消</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm}>确认</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
