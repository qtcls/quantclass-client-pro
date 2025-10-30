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
import ButtonTooltip from "@/renderer/components/ui/button-tooltip"
import { DataTableToolbar } from "@/renderer/components/ui/data-table-toolbar"
import { ScrollArea } from "@/renderer/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/renderer/components/ui/tabs"
import type { DataTableActionOptionsProps } from "@/renderer/page/data/table/options"
import BuyTable from "@/renderer/page/trading/plan/tables/BuyTable"
import SellTable from "@/renderer/page/trading/plan/tables/SellTable"
import type {
	BuyTableRef,
	SellTableRef,
} from "@/renderer/page/trading/plan/types"
import { ReloadIcon } from "@radix-ui/react-icons"
import { CircleHelpIcon } from "lucide-react"
import { useRef, useState } from "react"

export default function TradingPlan() {
	const [tab, setTab] = useState<"buy" | "sell">("buy")
	const buyTableRef = useRef<BuyTableRef>(null)
	const sellTableRef = useRef<SellTableRef>(null)

	return (
		<div className="flex flex-col h-full">
			<p className="text-muted-foreground mb-2 text-sm">
				交易计划生成后，不会立即生成买入卖出计划。需要等到交易时间，才会自动加载计划并生成。
			</p>
			<div className="flex items-center justify-between">
				<Tabs
					defaultValue="buy"
					onValueChange={(value) => setTab(value as "buy" | "sell")}
				>
					<TabsList>
						<TabsTrigger value="buy">买入计划</TabsTrigger>
						<TabsTrigger value="sell">卖出计划</TabsTrigger>
					</TabsList>
				</Tabs>

				<div className="flex items-center gap-2">
					<Button
						size="sm"
						variant="outline"
						className="h-8 text-foreground lg:flex"
						onClick={() => {
							if (tab === "buy") {
								buyTableRef.current?.refresh()
							}

							if (tab === "sell") {
								sellTableRef.current?.refresh()
							}
						}}
					>
						<ReloadIcon className="mr-2 h-4 w-4" />
						刷新列表
					</Button>

					<ButtonTooltip
						sideOffset={13}
						content={
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-2">
									<span className="size-1.5 rounded-full bg-gray-400" />
									<span>
										点击本按钮后，会重新计算实盘的隔日换仓、早盘换仓策略的买卖计划，并下单执行。
									</span>
								</div>
								<div className="flex items-center gap-2">
									<span className="size-1.5 rounded-full bg-gray-400" />
									<span>
										本按钮一般情况下不需要点击。因为客户端会在计划的时间，自动帮你执行。
									</span>
								</div>
								<div className="flex items-center gap-2">
									<span className="size-1.5 rounded-full bg-gray-400" />
									<span>
										只有确定客户端自动执行失败时，可以尝试点击本按钮重新执行。
									</span>
								</div>
							</div>
						}
					>
						<CircleHelpIcon className="size-4 hover:cursor-pointer" />
					</ButtonTooltip>
				</div>
			</div>

			<ScrollArea className="h-full">
				<div>
					{tab === "buy" ? (
						<BuyTable ref={buyTableRef} />
					) : (
						<SellTable ref={sellTableRef} />
					)}
				</div>
			</ScrollArea>
		</div>
	)
}

export function TradingPlanTableToolbar<T>(
	props: DataTableActionOptionsProps<T>,
) {
	return <DataTableToolbar {...props} enableSearch={false} />
}
