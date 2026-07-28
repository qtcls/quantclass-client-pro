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
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/renderer/components/ui/tooltip"
import { cn } from "@/renderer/lib/utils"

export interface StrategyNameDisplayProps {
	name: string
	remarkName?: string
	/** remark_name 为空时，展示 real_market 默认策略标识（不写回数据） */
	fallbackRemarkName?: string
	className?: string
	nameClassName?: string
	remarkClassName?: string
}

export function StrategyNameDisplay({
	name,
	remarkName,
	fallbackRemarkName,
	className,
	nameClassName,
	remarkClassName,
}: StrategyNameDisplayProps) {
	const displayRemark =
		remarkName?.trim() || fallbackRemarkName?.trim() || ""

	return (
		<div className={cn("flex min-w-0 flex-col", className)}>
			<span className={cn("leading-snug", nameClassName)}>{name}</span>
			{displayRemark ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<span
							className={cn(
								"block max-w-[10rem] truncate text-xs text-muted-foreground leading-snug",
								remarkClassName,
							)}
						>
							{displayRemark}
						</span>
					</TooltipTrigger>
					<TooltipContent side="bottom" className="max-w-xs break-all">
						{displayRemark}
					</TooltipContent>
				</Tooltip>
			) : null}
		</div>
	)
}
