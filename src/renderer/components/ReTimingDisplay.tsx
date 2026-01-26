/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { Input } from "@/renderer/components/ui/input"
import { TrendingUp } from "lucide-react"

interface ReTimingDisplayProps {
	reTiming?: { name: string; params: any[] } | null
}

export const ReTimingDisplay = ({ reTiming }: ReTimingDisplayProps) => {
	if (!reTiming) return null

	return (
		<div className="border rounded-lg p-3 my-2 bg-background">
			<div className="flex items-center gap-2 mb-2">
				<TrendingUp className="size-4" />
				<span className="font-medium text-sm">资金曲线再择时</span>
			</div>
			<div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-2">
				<span>因子名称</span>
				<span>因子参数</span>
			</div>
			<div className="grid grid-cols-2 gap-2">
				<Input
					value={reTiming.name}
					className="text-muted-foreground text-xs"
					readOnly
				/>
				<Input
					value={
						Array.isArray(reTiming.params)
							? JSON.stringify(reTiming.params)
							: reTiming.params !== null
								? String(reTiming.params)
								: "无参数"
					}
					className="text-muted-foreground text-xs font-mono"
					readOnly
				/>
			</div>
		</div>
	)
}
