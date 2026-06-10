/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { AcceleratedDataSourceAgreementContent } from "@/renderer/components/AcceleratedDataSourceAgreementContent"
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
import { Label } from "@/renderer/components/ui/label"
import { cn } from "@/renderer/lib/utils"
import { useCallback, useEffect, useRef, useState } from "react"

const SCROLL_THRESHOLD = 16

interface AcceleratedDataSourceConfirmDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: () => void
}

function isScrolledToBottom(element: HTMLDivElement) {
	return (
		element.scrollHeight - element.scrollTop - element.clientHeight <=
		SCROLL_THRESHOLD
	)
}

export function AcceleratedDataSourceConfirmDialog({
	open,
	onOpenChange,
	onConfirm,
}: AcceleratedDataSourceConfirmDialogProps) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false)
	const [hasAgreed, setHasAgreed] = useState(false)

	const updateScrollState = useCallback(() => {
		const element = scrollRef.current
		if (!element) return
		setHasScrolledToEnd(isScrolledToBottom(element))
	}, [])

	useEffect(() => {
		if (!open) {
			setHasScrolledToEnd(false)
			setHasAgreed(false)
			return
		}

		const element = scrollRef.current
		if (element) {
			element.scrollTop = 0
		}

		requestAnimationFrame(updateScrollState)
	}, [open, updateScrollState])

	const canConfirm = hasScrolledToEnd && hasAgreed

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[520px]">
				<DialogHeader className="space-y-2 border-b px-6 py-5 text-center sm:text-center">
					<DialogTitle className="text-base">
						《加速数据源使用协议》
					</DialogTitle>
					<DialogDescription>
						启用加速数据源前，请仔细阅读以下协议内容
					</DialogDescription>
				</DialogHeader>

				<div className="px-6 py-4">
					<div
						ref={scrollRef}
						onScroll={updateScrollState}
						className="h-[360px] overflow-y-scroll rounded-lg border bg-muted/30 px-4 py-3 shadow-inner"
					>
						<AcceleratedDataSourceAgreementContent />
					</div>
				</div>

				<div className="space-y-3 border-t bg-muted/10 px-6 py-4">
					<p
						className={cn(
							"text-center text-xs",
							hasScrolledToEnd
								? "text-muted-foreground"
								: "text-amber-600 dark:text-amber-500",
						)}
					>
						{hasScrolledToEnd
							? "您已阅读至协议末尾，请勾选同意后继续"
							: "请滑动至底部查阅完整协议"}
					</p>

					<div className="flex items-start gap-3 rounded-md border bg-background px-3 py-3">
						<Checkbox
							id="accelerated-data-agreement"
							checked={hasAgreed}
							disabled={!hasScrolledToEnd}
							onCheckedChange={(checked) => setHasAgreed(checked === true)}
							className="mt-0.5"
						/>
						<Label
							htmlFor="accelerated-data-agreement"
							className={cn(
								"text-sm leading-snug",
								hasScrolledToEnd
									? "cursor-pointer font-medium"
									: "cursor-not-allowed text-muted-foreground",
							)}
						>
							我已阅读并同意《加速数据源使用协议》
						</Label>
					</div>
				</div>

				<DialogFooter className="gap-3 border-t px-6 py-4 sm:justify-center">
					<Button
						variant="outline"
						className="min-w-[120px]"
						onClick={() => onOpenChange(false)}
					>
						暂不启用
					</Button>
					<Button
						className="min-w-[160px]"
						disabled={!canConfirm}
						onClick={onConfirm}
					>
						我已理解，确认启用
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
