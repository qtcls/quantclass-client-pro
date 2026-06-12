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
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/renderer/components/ui/tooltip"
import {
	fusionAtom,
	libraryTypeAtom,
	rebTimeConfigAtom,
	selectStgDictAtom,
	selectStgListAtom,
} from "@/renderer/store/storage"
import type {
	PosStrategyType,
	RebTimeConfig,
	SelectStgType,
} from "@/renderer/types/strategy"
import { generateNonStrategySelectStrategyConfig } from "@/renderer/utils"
import { buildRealMarketData } from "@/renderer/utils/real-market-data"
import { formatRebTimeDisplay } from "@/renderer/utils/time"
import {
	regenerateRebTime,
	saveStrategyList,
	saveStrategyListFusion,
} from "@/renderer/utils/strategy"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { Clock, InfoIcon, RefreshCw } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

const { saveRealMarketData, checkKernalRunning } = window.electronAPI

interface RebTimeConfigModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

function RebTimeConfigBody() {
	const [rebTimeConfig, setRebTimeConfig] = useAtom(rebTimeConfigAtom)
	const setSelectStgDict = useSetAtom(selectStgDictAtom)
	const libraryType = useAtomValue(libraryTypeAtom)
	const fusion = useAtomValue(fusionAtom)
	const selectStgList = useAtomValue(selectStgListAtom)
	const [regeneratingRebTime, setRegeneratingRebTime] = useState<string | null>(
		null,
	)

	// 非策略选股配置
	const NON_STRATEGY_CONFIG = useMemo(
		() =>
			generateNonStrategySelectStrategyConfig([
				"5_0",
				"5_1",
				"5_2",
				"5_3",
				"5_4",
				5,
			]),
		[],
	)

	const handleRegenerateRebTime = async (rebTime: string) => {
		const isRunning = await checkKernalRunning(["rocket"])
		if (isRunning) {
			toast.warning("实盘内核正在运行中，无法修改换仓时间配置")
			return
		}

		setRegeneratingRebTime(rebTime)

		try {
			const newRebTimeConfig = regenerateRebTime(rebTimeConfig, rebTime)

			let selectStgDict: Record<string, any> = {}
			let finalRebTimeConfig: Record<string, RebTimeConfig> = {}

			switch (libraryType) {
				case "pos": {
					const result = await saveStrategyListFusion(fusion, newRebTimeConfig)
					selectStgDict = result.strategyDict
					finalRebTimeConfig = result.rebTimeConfig
					break
				}
				case "select": {
					const result = await saveStrategyList(selectStgList, newRebTimeConfig)
					selectStgDict = result.strategyDict
					finalRebTimeConfig = result.rebTimeConfig
					break
				}
				default:
					break
			}

			setSelectStgDict(selectStgDict)
			setRebTimeConfig(finalRebTimeConfig)

			// -- S2b：共用纯构造 + 原子全量替换落盘（去独立 clean）；落盘失败不报成功 toast
			const parsedData = buildRealMarketData(selectStgDict, NON_STRATEGY_CONFIG)
			const ack = await saveRealMarketData(parsedData)
			if (!ack.ok) {
				console.error("[reb-time] real_market_25.json 落盘失败", ack.error)
				toast.error("换仓时间已更新，但保存到实盘配置失败，请重试")
				return
			}

			toast.success(`已重新生成 "${rebTime}" 的换仓时间`)
		} catch (error) {
			console.error("重新生成换仓时间失败:", error)
			toast.error("重新生成换仓时间失败")
		} finally {
			setRegeneratingRebTime(null)
		}
	}

	const rebTimeEntries = Object.entries(rebTimeConfig)

	return (
		<div className="space-y-4">
			{rebTimeEntries.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground">
					<p>暂无换仓时间配置</p>
					<p className="text-sm mt-2">请先导入策略</p>
				</div>
			) : (
				<>
					{rebTimeEntries.map(([rebTime, config]) => (
						<div key={rebTime} className="border rounded-lg p-4">
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-2">
									<span className="font-medium text-lg">{rebTime}</span>
								</div>
								<Button
									size="sm"
									variant="outline"
									disabled={regeneratingRebTime === rebTime}
									onClick={() => handleRegenerateRebTime(rebTime)}
									className="gap-1"
								>
									<RefreshCw
										className={`size-4 ${
											regeneratingRebTime === rebTime ? "animate-spin" : ""
										}`}
									/>
									{regeneratingRebTime === rebTime
										? "生成中..."
										: "重新生成换仓时间"}
								</Button>
							</div>

							<div className="grid grid-cols-2 gap-4 mb-3">
								<div className="flex items-center gap-2">
									<span className="text-sm text-muted-foreground">
										卖出时间:
									</span>
									<span className="font-mono text-sm bg-muted px-2 py-1 rounded">
										{formatRebTimeDisplay(config.sell_time)}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-sm text-muted-foreground">
										买入时间:
									</span>
									<span className="font-mono text-sm bg-muted px-2 py-1 rounded">
										{formatRebTimeDisplay(config.buy_time)}
									</span>
								</div>
							</div>

							<div className="border-t pt-3">
								<div className="flex items-center gap-1 mb-2">
									<span className="text-sm text-muted-foreground">
										使用此换仓时间的策略 ({config.strategies.length}):
									</span>
									<Tooltip>
										<TooltipTrigger asChild>
											<InfoIcon className="size-3.5 text-muted-foreground cursor-pointer" />
										</TooltipTrigger>
										<TooltipContent>
											<p className="text-xs">这些策略共享相同的卖出/买入时间</p>
										</TooltipContent>
									</Tooltip>
								</div>
								{config.strategies.length > 0 ? (
									<div className="flex flex-wrap gap-2">
										{config.strategies.map(
											(
												strategy: SelectStgType | PosStrategyType,
												index: number,
											) => (
												<span
													key={`${strategy.name}-${index}`}
													className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded"
												>
													{strategy.name}
												</span>
											),
										)}
									</div>
								) : (
									<span className="text-xs text-muted-foreground">
										暂无策略
									</span>
								)}
							</div>
						</div>
					))}
				</>
			)}
		</div>
	)
}

export default function RebTimeConfigModal({
	open,
	onOpenChange,
}: RebTimeConfigModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Clock className="size-5" />
						换仓时间配置
					</DialogTitle>
				</DialogHeader>
				<div className="flex gap-3 rounded-lg border border-blue-500/25 bg-blue-500/10 dark:border-blue-400/30 dark:bg-blue-500/15 px-4 py-3 text-sm">
					<InfoIcon className="size-4 shrink-0 mt-1 text-blue-600 dark:text-blue-400" />
					<p className="min-w-0 flex-1 text-blue-900/90 dark:text-blue-100/90 leading-relaxed">
						在此统一配置同一{" "}
						<span className="font-bold text-blue-900/90 dark:text-blue-100/90">
							rebalance_time
						</span>{" "}
						下各策略的换仓时间（卖出/买入时间）。下方每个区块对应一种换仓模式，其下列出的策略将共用该模式的换仓时间。
					</p>
				</div>
				<RebTimeConfigBody />
			</DialogContent>
		</Dialog>
	)
}

// 用于嵌在 Tabs 里
export function RebTimeConfigContent() {
	return <RebTimeConfigBody />
}
