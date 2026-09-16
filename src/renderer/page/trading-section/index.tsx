import { SectionPage } from "@/renderer/components/section-tabs"
import PositionInfo from "@/renderer/page/position"
import StrategyLibraryHub from "@/renderer/page/strategy-library-hub"
import TradingPage from "@/renderer/page/trading"
import type { FC } from "react"

const TABS = [
	{ key: "real_trading", label: "实盘" },
	{ key: "library_hub", label: "策略库" },
	{ key: "position", label: "持仓信息" },
] as const

type TabKey = (typeof TABS)[number]["key"]

const TradingSectionPage: FC = () => {
	return (
		<SectionPage tabs={TABS} defaultTab="real_trading">
			{(activeTab: TabKey) => (
				<>
					{activeTab === "library_hub" && <StrategyLibraryHub />}
					{activeTab === "real_trading" && <TradingPage />}
					{activeTab === "position" && <PositionInfo />}
				</>
			)}
		</SectionPage>
	)
}

export default TradingSectionPage
