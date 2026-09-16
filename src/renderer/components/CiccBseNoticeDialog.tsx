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
import { Button } from "./ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog"

const CICC_BSE_MESSAGE = `检测到当前券商为中金。中金暂不支持北交所业务，具体限制包括但不限于：

• 行情数据：无法获取北交所股票行情
• 交易下单：无法交易北交所股票

我们已在实盘设置中为您自动开启「过滤北交所」选项，选股与交易将自动排除北交所股票。若您有北交所交易需求，请更换其他券商后再使用。`

export interface CiccBseNoticeDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: () => void
}

export function CiccBseNoticeDialog({
	open,
	onOpenChange,
	onConfirm,
}: CiccBseNoticeDialogProps) {
	const handleConfirm = () => {
		onConfirm()
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-amber-500" />
						中金券商北交所提示
					</DialogTitle>
					<DialogDescription className="pt-2 whitespace-pre-line">
						{CICC_BSE_MESSAGE}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button onClick={handleConfirm}>我已知晓，不再提示</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
