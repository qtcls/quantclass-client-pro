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
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { useEffect, useState } from "react"

interface ResearchRedownloadConfirmDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	versionName: string
	onConfirm: (overwrite: boolean) => void
}

export function ResearchRedownloadConfirmDialog({
	open,
	onOpenChange,
	versionName,
	onConfirm,
}: ResearchRedownloadConfirmDialogProps) {
	const [overwrite, setOverwrite] = useState(false)
	const displayName = versionName || "未命名"

	useEffect(() => {
		if (open) setOverwrite(false)
	}, [open])

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md gap-4">
				<DialogHeader>
					<DialogTitle>重新下载</DialogTitle>
					<DialogDescription asChild>
						<p className="text-sm text-muted-foreground leading-relaxed">
							本地已存在版本「
							<span className="text-foreground font-medium">{displayName}</span>
							」。
						</p>
					</DialogDescription>
				</DialogHeader>

				<p className="text-sm text-muted-foreground leading-relaxed">
					默认保留原文件夹，新建「{displayName} (1)」等文件夹。
				</p>

				<div className="flex items-start gap-2.5 rounded-lg border bg-muted/40 px-3 py-3">
					<Checkbox
						id="research-redownload-overwrite"
						className="mt-0.5"
						checked={overwrite}
						onCheckedChange={(checked) => setOverwrite(checked === true)}
					/>
					<label
						htmlFor="research-redownload-overwrite"
						className="cursor-pointer leading-snug"
					>
						<span className="text-sm font-medium text-foreground">
							覆盖原文件夹
						</span>
						<span className="mt-0.5 block text-xs text-muted-foreground">
							勾选后替换原文件夹内容，不保留旧文件
						</span>
					</label>
				</div>

				<DialogFooter className="gap-2 sm:justify-end">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						取消
					</Button>
					<Button
						onClick={() => {
							onConfirm(overwrite)
							onOpenChange(false)
						}}
					>
						确认下载
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
