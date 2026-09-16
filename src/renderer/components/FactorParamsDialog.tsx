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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { Input as InputUI } from "@/renderer/components/ui/input"
import { cn } from "@/renderer/lib/utils"
import { CircuitBoard, Settings } from "lucide-react"

interface FactorListDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	factorList: Array<[string, boolean, any, string | number | null]>
}

export function FactorListDialog({
	open,
	onOpenChange,
	factorList,
}: FactorListDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-1">
						<CircuitBoard className="size-4" />
						选股因子列表
					</DialogTitle>
					<DialogDescription>
						共 {factorList.length} 个选股因子
					</DialogDescription>
				</DialogHeader>

				<div className={cn("flex flex-col px-1")}>
					<div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
						<span>因子名称</span>
						<span>排序方式</span>
						<span>因子参数</span>
						<span>因子计算参数（比如权重）</span>
					</div>

					<div className="space-y-2">
						{factorList.map(
							(
								factor: [string, boolean, any, string | number | null],
								index: number,
							) => (
								<div key={index} className="grid grid-cols-4 gap-2">
									<InputUI
										value={factor[0]} // -- 因子名称
										className="text-muted-foreground text-xs"
										readOnly
									/>
									<InputUI
										value={factor[1] ? "从小到大排序" : "从大到小排序"} // -- 排序方式
										className="text-muted-foreground text-xs"
										readOnly
									/>
									<InputUI
										value={
											factor[2] !== null ? JSON.stringify(factor[2]) : "无参数"
										} // -- 因子参数
										className="text-muted-foreground text-xs font-mono"
										readOnly
									/>
									<InputUI
										value={factor[3] ?? ""} // -- 因子计算参数（比如权重）
										className="text-muted-foreground text-xs"
										readOnly
									/>
								</div>
							),
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

interface ParamsDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	params: Record<string, any>
}

export function ParamsDialog({
	open,
	onOpenChange,
	params,
}: ParamsDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-1">
						<Settings className="size-4" />
						参数配置
					</DialogTitle>
					<DialogDescription>
						共 {Object.keys(params).length} 个参数
					</DialogDescription>
				</DialogHeader>

				<div className={cn("flex flex-col px-1")}>
					<div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-2">
						<span>参数名称</span>
						<span>参数值</span>
					</div>

					<div className="space-y-2">
						{Object.entries(params).map(([key, value]) => (
							<div key={key} className="grid grid-cols-2 gap-2">
								<InputUI
									value={key}
									className="text-muted-foreground text-xs font-medium"
									readOnly
								/>
								<InputUI
									value={
										typeof value === "object" && value !== null
											? JSON.stringify(value)
											: String(value)
									}
									className="text-muted-foreground text-xs font-mono"
									readOnly
								/>
							</div>
						))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
