/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { ScrollArea } from "@/renderer/components/ui/scroll-area"
import { H2 } from "@/renderer/components/ui/typography"
import { BacktestResultProvider } from "@/renderer/page/backtest/context"
import { RunResultTable } from "@/renderer/page/backtest/results"
import { BacktestSettings } from "@/renderer/page/backtest/settings"
import { userAtom } from "@/renderer/store/user"
import { checkPermission } from "@/shared/lib/permission"
import { useAtomValue } from "jotai"
import { BacktestControls } from "./controls"

export default function StrategyRun() {
	return (
		<ScrollArea className="h-full">
			<BacktestResultProvider>
				<StrategyRunContent />
			</BacktestResultProvider>
		</ScrollArea>
	)
}

function StrategyRunContent() {
	const { permissions } = useAtomValue(userAtom)
	const isMember = checkPermission(permissions, "isMember")
	return (
		<div className="h-full flex-1 flex-col md:flex pt-3">
			<div className="flex items-end mb-1">
				<H2>{isMember ? "仓位管理" : "选股"}策略回测</H2>
			</div>
			<div className="flex flex-col w-full space-y-1">
				{/* <p className="text-muted-foreground">
							试运行你准备实盘的策略，排查相关问题。本页面的任何操作，不会影响到实盘，请放心试跑。
						</p> */}
				{/* <h3 className="font-semibold flex items-center">
					<SettingsGearIcon className="size-4 mr-2" /> 回测设置
				</h3> */}
				<BacktestSettings />
				<BacktestControls />
			</div>
			<hr className="my-3" />

			<div className="space-y-2">
				<RunResultTable mode="backtest" />
			</div>
		</div>
	)
}
