import { SectionPage } from "@/renderer/components/section-tabs"
import StrategyRun from "@/renderer/page/backtest"
import StrategyLibrary from "@/renderer/page/library"
import FusionStrategyLibrary from "@/renderer/page/library/fusion"
import PositionInfo from "@/renderer/page/position"
import TradingPage from "@/renderer/page/trading"
import type { FC } from "react"

const TABS = [
	{ key: "real_trading", label: "实盘" },
	{ key: "select_strategy", label: "选股策略" },
	{ key: "fusion_strategy", label: "综合策略库" },
	{ key: "backtest", label: "回测" },
	{ key: "position", label: "持仓信息" },
] as const

type TabKey = (typeof TABS)[number]["key"]

const TradingSectionPage: FC = () => {
	return (
		<SectionPage tabs={TABS} defaultTab="real_trading">
			{(activeTab: TabKey) => (
				<>
					{activeTab === "select_strategy" && <StrategyLibrary />}
					{activeTab === "fusion_strategy" && <FusionStrategyLibrary />}
					{activeTab === "backtest" && <StrategyRun />}
					{activeTab === "real_trading" && <TradingPage />}
					{activeTab === "position" && <PositionInfo />}
				</>
			)}
		</SectionPage>
	)
}

export default TradingSectionPage
