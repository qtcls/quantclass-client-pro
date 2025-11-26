import StatusTimeline from "@/renderer/components/StrategyStatusTimeLine"
import { Button } from "@/renderer/components/ui/button"
import ButtonTooltip from "@/renderer/components/ui/button-tooltip"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { NumberTicker } from "@/renderer/components/ui/number-ticker"
import { H3 } from "@/renderer/components/ui/typography"
// import { POSITION_INFO_PAGE } from "@/renderer/constant"
import { usePermissionCheck } from "@/renderer/hooks"
import { useHandleTimeTask } from "@/renderer/hooks"
import { useToggleAutoRealTrading } from "@/renderer/hooks/useToggleAutoRealTrading"
import BuyBlacklist from "@/renderer/page/trading/buy-blacklist"
import { isUpdatingAtom } from "@/renderer/store"
// import { realTradingTabAtom } from "@/renderer/store"
import { loadAccountQueryAtom } from "@/renderer/store/query"
import {
	accountKeyAtom,
	// libraryTypeAtom,
	showMoneyAtom,
	totalWeightAtom,
} from "@/renderer/store/storage"
import { useAtom, useAtomValue } from "jotai"
import { Eye, EyeOff, Library, Play, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import TradeCtrlBtn from "../../components/trade-ctrl-btn"
// import { useNavigate } from "react-router"

const { getStoreValue } = window.electronAPI

export const RealMarketKanban = () => {
	// const navigate = useNavigate()
	const [confirmStartAutoUpdate, setConfirmStartAutoTrading] = useState(false)
	const { check } = usePermissionCheck()
	const [showMoney, setShowMoney] = useAtom(showMoneyAtom)
	const totalWeight = useAtomValue(totalWeightAtom)
	const isUpdating = useAtomValue(isUpdatingAtom)
	const { apiKey, uuid } = useAtomValue(accountKeyAtom)
	// const navigate = useNavigate()
	// const [_, setActiveTab] = useAtom(activeTabAtom)

	const { isAutoRocket, handleToggleAutoRocket } = useToggleAutoRealTrading()
	const handleTimeTask = useHandleTimeTask()
	const [, setSelectModuleTimes] = useState<string[]>([])
	// const setActiveTab = useSetAtom(realTradingTabAtom)

	const [{ data, refetch }] = useAtom(loadAccountQueryAtom)
	// const libraryType = useAtomValue(libraryTypeAtom)

	useEffect(() => {
		if (
			check({ requireMember: true, windowsOnly: true, skipToast: true }).isValid
		) {
			refetch().then(() => {
				console.log("loadAccountQueryAtom success")
			})
		}
	}, [])

	useEffect(() => {
		if (apiKey === "" && uuid === "" && isAutoRocket) {
			handleToggleAutoRocket(false).then(() => {
				console.log("handleToggleAutoRocket false success")
			})
		}
	}, [apiKey, uuid])

	useEffect(() => {
		getStoreValue("schedule.selectModule", []).then((selectModuleTimes) => {
			setSelectModuleTimes(selectModuleTimes as string[])
		})
	}, [setSelectModuleTimes])

	return (
		<>
			<div className="flex-1 flex flex-col gap-2 w-full">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-2">
							<Library size={26} />
							<H3>策略中心</H3>/
						</div>

						<ButtonTooltip content="切换资金展示">
							{showMoney ? (
								<Eye
									className="size-4 translate-y-[1px] text-muted-foreground hover:cursor-pointer"
									onClick={() => setShowMoney((prev) => !prev)}
								/>
							) : (
								<EyeOff
									className="size-4 translate-y-[1px] text-muted-foreground hover:cursor-pointer"
									onClick={() => setShowMoney((prev) => !prev)}
								/>
							)}
						</ButtonTooltip>

						<ButtonTooltip content="手动刷新资金信息">
							<RefreshCw
								className="size-4 translate-y-[1px] text-muted-foreground hover:cursor-pointer animate-spin"
								onClick={() => refetch()}
							/>
						</ButtonTooltip>
					</div>

					<TradeCtrlBtn
						onClick={() => {
							// -- 权限检查
							if (
								!check({
									requireMember: true,
									windowsOnly: true,
								}).isValid
							) {
								return
							}

							if (isAutoRocket) {
								handleToggleAutoRocket(false).then(() => {
									console.log("handleToggleAutoRocket false success")
								})
							} else {
								setConfirmStartAutoTrading(true)
							}
						}}
					/>

					{/* <Button
					variant="linkHover1"
					className="text-base text-muted-foreground"
					onClick={() => {
						navigate(POSITION_INFO_PAGE)
						setActiveTab("positionInfo")
					}}
				>
					<WeightIcon className="w-4 h-4 mr-2" /> 查看持仓
				</Button> */}
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					<div className="flex items-baseline gap-1">
						<span>资金占用:</span>
						<span className="text-primary leading-none font-bold">
							{showMoney ? (
								totalWeight === 0 ? (
									totalWeight
								) : (
									<NumberTicker value={totalWeight} />
								)
							) : (
								"****"
							)}
							%
						</span>
					</div>

					<div className="flex items-baseline gap-1">
						<span className="">可用资金:</span>
						<span className="text-primary font-bold leading-none">
							{showMoney ? (
								data?.可用资金 ? (
									<NumberTicker value={data.可用资金} />
								) : (
									"--"
								)
							) : (
								"****"
							)}
						</span>
						<span className="leading-none">¥</span>
					</div>

					<div className="flex items-baseline gap-1">
						<span>总资产:</span>
						<span className="text-primary font-bold leading-none">
							{showMoney ? (
								data?.总资产 ? (
									<NumberTicker value={data.总资产} />
								) : (
									"--"
								)
							) : (
								"****"
							)}
						</span>
						<span className="leading-none">¥</span>
					</div>
				</div>

				{/* <div className="flex items-center gap-2"></div> */}

				{/* {libraryType !== "pos" && (
					<Card className="p-0">
						<CardContent className="p-2">
							<FinPieChart
								withTitle={false}
								totalCap={data?.总资产 ?? -1}
								availCap={data?.可用资金 ?? -1}
							/>
						</CardContent>
					</Card>
				)} */}

				<StatusTimeline />
				<div className="space-y-1">
					<BuyBlacklist />
				</div>
				{/* <div className="flex items-center justify-center gap-2">
					<Button
						variant="linkHover1"
						size="sm"
						onClick={() => {
							navigate(STRATEGY_LIBRARY_PAGE)
							setActiveTab(REAL_TRADING_TAB_NAME)
						}}
					>
						前往策略库
					</Button>
				</div> */}
			</div>

			<Dialog
				open={confirmStartAutoUpdate}
				onOpenChange={(value) => setConfirmStartAutoTrading(value)}
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
								<span className="font-bold">自动更新数据</span>
								：会实时检查并自动完成数据的处理与存储，尽量保证本地数据是最新的。
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
		</>
	)
}
