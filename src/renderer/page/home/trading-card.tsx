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
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { ScrollArea } from "@/renderer/components/ui/scroll-area"
import { AlertDialogProvider } from "@/renderer/context/alert-dialog"
import { TRADING_SECTION_ROUTE } from "@/renderer/constant"
import { usePermissionCheck } from "@/renderer/hooks"
import { useHandleTimeTask, useScheduleTimes } from "@/renderer/hooks"
import { useMinDataSchedule } from "@/renderer/hooks"
import { useToggleAutoRealTrading } from "@/renderer/hooks/useToggleAutoRealTrading"
import ScheduleControl from "@/renderer/page/home/schedule"
import BuyBlacklist from "@/renderer/page/trading/buy-blacklist"
import { isMinDataUpdatingAtom, isUpdatingAtom } from "@/renderer/store"
import {
	accountKeyAtom,
	fusionAtom,
	libraryTypeAtom,
	realMarketConfigSchemaAtom,
	selectStgListAtom,
} from "@/renderer/store/storage"
import type {
	PosStrategyType,
	SelectStgType,
	StgGroupType,
} from "@/renderer/types/strategy"
import { getBrokerNameByAccountId } from "@/renderer/utils/broker"
import { useAtomValue } from "jotai"
import { ArrowRight, CalendarSync, Play, RefreshCw, ShieldBan, TrendingUp } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"

export function TradingCard() {
	const navigate = useNavigate()
	const [confirmStartAutoTrading, setConfirmStartAutoTrading] = useState(false)
	const [buyBlacklistOpen, setBuyBlacklistOpen] = useState(false)
	const [scheduleOpen, setScheduleOpen] = useState(false)
	const { checkWithToast } = usePermissionCheck()
	const { apiKey, uuid } = useAtomValue(accountKeyAtom)
	const isUpdating = useAtomValue(isUpdatingAtom)
	const isMinDataUpdating = useAtomValue(isMinDataUpdatingAtom)
	const { isAutoRocket, handleToggleAutoRocket } = useToggleAutoRealTrading()
	const { selectScheduleTimes } = useScheduleTimes()
	const handleTimeTask = useHandleTimeTask()
	const { startMinDataSchedule } = useMinDataSchedule()
	const libraryType = useAtomValue(libraryTypeAtom)
	const selectStgList = useAtomValue(selectStgListAtom)
	const fusion = useAtomValue(fusionAtom)
	const realMarketConfig = useAtomValue(realMarketConfigSchemaAtom)

	const runningStrategyCount = useMemo(() => {
		const strategies =
			libraryType === "pos"
				? (fusion as (SelectStgType | StgGroupType | PosStrategyType)[])
				: selectStgList

		return strategies.filter((strategy) => (strategy.cap_weight ?? 0) !== 0)
			.length
	}, [libraryType, selectStgList, fusion])

	const accountSubtitle = useMemo(() => {
		const accountId = realMarketConfig?.account_id ?? ""
		const brokerName = getBrokerNameByAccountId(accountId)
		const brokerLabel = brokerName || accountId.trim() || "--"
		return `${brokerLabel} · ${runningStrategyCount} 策略在跑`
	}, [realMarketConfig?.account_id, runningStrategyCount])

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-shot on mount
	useEffect(() => {
		if (apiKey === "" && uuid === "" && isAutoRocket) {
			handleToggleAutoRocket(false).then(() => {
				console.log("handleToggleAutoRocket false success")
			})
		}
	}, [apiKey, uuid])

	const handleTradeCtrlClick = () => {
		if (
			!checkWithToast({
				requireMember: true,
				windowsOnly: true,
			}).isValid
		) {
			return
		}

		setConfirmStartAutoTrading(true)
	}

	return (
		<>
			<div className="bg-background border border-border rounded-xl overflow-hidden flex flex-col hover:border-foreground/30 transition-colors">
				<div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border">
					<span className="w-8 h-8 rounded-lg bg-muted grid place-items-center flex-shrink-0">
						<TrendingUp size={18} strokeWidth={1.8} />
					</span>
					<span className="flex-1 min-w-0">
						<b className="text-base font-[650] block tracking-tight">实盘</b>
						<span className="text-xs text-muted-foreground">
							单账户 · 多组合即将上线
						</span>
					</span>
					{isAutoRocket ? (
						<ButtonTooltip
							content={
								selectScheduleTimes.length > 0
									? "点击暂停定时实盘（只在指定时间运行）"
									: "点击暂停自动实盘"
							}
						>
							<button
								type="button"
								onClick={() => void handleToggleAutoRocket(false)}
								className="w-10 h-10 rounded-lg grid place-items-center flex-shrink-0 text-green-600 hover:bg-green-500/10 transition-colors"
							>
								<RefreshCw className="size-5 animate-spin" />
							</button>
						</ButtonTooltip>
					) : (
						<ButtonTooltip
							content={
								selectScheduleTimes.length > 0
									? "启动定时实盘（只在指定时间运行）"
									: "启动自动实盘"
							}
						>
							<button
								type="button"
								onClick={handleTradeCtrlClick}
								className="w-10 h-10 rounded-lg grid place-items-center flex-shrink-0 text-foreground hover:bg-muted transition-colors"
							>
								<Play className="size-5 fill-current" />
							</button>
						</ButtonTooltip>
					)}
				</div>
				<div className="px-4 py-3.5 flex-1 flex flex-col">
					<div className="flex items-center gap-2.5 py-2">
						<span
							className="w-2.5 h-2.5 rounded-full flex-shrink-0"
							style={{ background: "#0ea5e9" }}
						/>
						<span className="flex-1 min-w-0">
							<b className="text-sm font-semibold block">主账户A</b>
							<span className="text-[10px] font-mono text-muted-foreground">
								{accountSubtitle}
							</span>
						</span>
					</div>
					<div className="h-px bg-border" />
					<div className="flex items-center gap-2.5 py-2 opacity-60">
						<span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-muted-foreground/30" />
						<span className="flex-1 min-w-0">
							<b className="text-sm font-semibold block text-muted-foreground">
								激进组合B
							</b>
							<span className="text-[10px] font-mono text-muted-foreground">
								独立账户 · 多组合
							</span>
						</span>
						<span className="text-[10px] font-mono px-2 py-0.5 rounded-full text-muted-foreground bg-muted border border-border">
							即将上线
						</span>
					</div>
					<div className="h-px bg-border" />
					<div className="flex items-center gap-2.5 py-2 opacity-60">
						<span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-muted-foreground/30" />
						<span className="flex-1 min-w-0">
							<b className="text-sm font-semibold block text-muted-foreground">
								稳健组合C
							</b>
							<span className="text-[10px] font-mono text-muted-foreground">
								独立账户 · 多组合
							</span>
						</span>
						<span className="text-[10px] font-mono px-2 py-0.5 rounded-full text-muted-foreground bg-muted border border-border">
							即将上线
						</span>
					</div>
				</div>
				<button
					type="button"
					onClick={() => setBuyBlacklistOpen(true)}
					className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border-t border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
				>
					<ShieldBan className="size-3.5" strokeWidth={1.9} />
					买入黑名单
				</button>
				<button
					type="button"
					onClick={() => setScheduleOpen(true)}
					className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border-t border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
				>
					<CalendarSync className="size-3.5" strokeWidth={1.9} />
					运行计划设置
				</button>
				<button
					type="button"
					onClick={() => navigate(TRADING_SECTION_ROUTE)}
					className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors w-full text-left"
				>
					<span>进入实盘驾驶舱</span>
					<ArrowRight size={15} strokeWidth={2} />
				</button>
			</div>

			<Dialog
				open={confirmStartAutoTrading}
				onOpenChange={setConfirmStartAutoTrading}
			>
				<DialogContent className="max-w-lg p-4">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Play size={20} />
							启动自动实盘
						</DialogTitle>
					</DialogHeader>
					<div className="text-primary leading-relaxed space-y-2">
						{!isUpdating && (
							<p>
								<span className="font-bold">自动更新历史数据</span>
								：会实时检查并自动完成数据的处理与存储，尽量保证本地数据是最新的。
							</p>
						)}
						{!isMinDataUpdating && (
							<p>
								<span className="font-bold">自动更新实时数据</span>
								：会在交易时段内自动获取分钟级 K
								线数据，保证选股和交易所需数据是最新的。
							</p>
						)}
						<p>
							<span className="font-bold">自动选股</span>
							：会根据你策略库中的配置，自动实时计算选股结果。
						</p>
						<p>
							<span className="font-bold">自动交易</span>
							：成功配置QMT后，会根据最新选股指令进行自动交易
						</p>
					</div>
					<DialogFooter>
						<Button
							className="hover:cursor-pointer w-full"
							onClick={async () => {
								if (!isUpdating) {
									await handleTimeTask(false)
								}
								if (!isMinDataUpdating) {
									await startMinDataSchedule()
								}
								if (!isUpdating || !isMinDataUpdating) {
									await handleToggleAutoRocket(true, true, true)
								} else {
									await handleToggleAutoRocket(true)
								}

								setConfirmStartAutoTrading(false)
							}}
						>
							<Play className="h-5 w-5 mr-0.5" />
							启动自动实盘
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={buyBlacklistOpen} onOpenChange={setBuyBlacklistOpen}>
				<DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0">
					<ScrollArea className="max-h-[85vh] p-6">
						<AlertDialogProvider>
							<BuyBlacklist />
						</AlertDialogProvider>
					</ScrollArea>
				</DialogContent>
			</Dialog>

			<Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
				<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6">
					<ScheduleControl />
				</DialogContent>
			</Dialog>
		</>
	)
}
