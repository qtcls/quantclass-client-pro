/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import TradeCtrlBtn from "@/renderer/components/trade-ctrl-btn"
import { Badge } from "@/renderer/components/ui/badge"
import { Button } from "@/renderer/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { useToggleAutoRealTrading } from "@/renderer/hooks"
import { TradingConfigForm } from "@/renderer/page/trading/config-form"
import { realConfigEditModalAtom } from "@/renderer/store"
import { backtestConfigAtom, libraryTypeAtom } from "@/renderer/store/storage"
import { useQuery } from "@tanstack/react-query"
import { useAtom, useAtomValue } from "jotai"
import { Settings, TvMinimalPlay } from "lucide-react"
import { useEffect, useState } from "react"
import { RealResultProvider } from "../backtest/context"
import { RunResultTable } from "../backtest/results"

export default function TradingControl() {
	const { loadAquaTradingInfo, getStoreValue } = window.electronAPI
	const backtestConfig = useAtomValue(backtestConfigAtom)
	const [_, setSelectModuleTimes] = useState<string[]>([])

	const [realConfigEditModal, setRealConfigEditModal] = useAtom(
		realConfigEditModalAtom,
	)

	const { isAutoRocket } = useToggleAutoRealTrading()

	const { data, isLoading } = useQuery({
		queryKey: ["load-aqua-trading-info"],
		queryFn: () => loadAquaTradingInfo(),
		refetchInterval: 7 * 1000,
	})
	const libraryType = useAtomValue(libraryTypeAtom)

	useEffect(() => {
		getStoreValue("schedule.selectModule", []).then((selectModuleTimes) => {
			setSelectModuleTimes(selectModuleTimes as string[])
		})
	}, [setSelectModuleTimes])
	return (
		<>
			<div className="text-muted-foreground flex items-center gap-2 pt-1 mb-2">
				查看最新选股结果。预计股数和资金分配，以回测初始资金
				<Badge>
					￥
					{backtestConfig.initial_cash
						.toString()
						.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
				</Badge>
				预估
			</div>
			<div className="mx-auto w-full">
				<RealResultProvider>
					<div className="space-y-2 xl:space-y-3">
						<RunResultTable mode="real" />
						{data?.duration > 0 && !isLoading && (
							<div className="text-muted-foreground space-y-1 text-sm">
								<Badge variant="secondary" className="mr-2">
									选股结果信息
								</Badge>
								启动：
								<span>{data?.startTime}</span>
								，完成：
								<span>{data?.endTime}</span>，耗时：
								<span>{data?.duration}</span>
								s。 选股检查时间：
								<span>{data?.wakeTime}</span>
							</div>
						)}
						<div className="flex items-center gap-2">
							<TradeCtrlBtn onClick={() => setRealConfigEditModal(true)} />

							<Button
								variant="outline"
								disabled={isAutoRocket}
								onClick={() => setRealConfigEditModal(true)}
							>
								<Settings className="mr-2 size-4" /> 配置实盘参数
							</Button>
						</div>
					</div>
				</RealResultProvider>
			</div>

			<Dialog
				open={realConfigEditModal}
				onOpenChange={(value) => setRealConfigEditModal(value)}
			>
				<DialogContent className="p-4 max-w-4xl">
					<DialogHeader>
						<DialogTitle className="flex items-center">
							<TvMinimalPlay className="mr-2" size={22} />
							<span>实盘配置</span>
						</DialogTitle>
					</DialogHeader>
					<TradingConfigForm />
				</DialogContent>
			</Dialog>
		</>
	)
}
