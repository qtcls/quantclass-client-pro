import { SectionPage } from "@/renderer/components/section-tabs"
import ResearchFrameworkSourcePage from "@/renderer/page/research/basic-code"
import ResearchStrategyLibraryPage from "@/renderer/page/research/strategies"
import type { FC } from "react"

const TABS = [
	{ key: "strategy_library", label: "精心随机策略库" },
	{ key: "framework_source", label: "框架源码" },
] as const

type TabKey = (typeof TABS)[number]["key"]

const ResearchSectionPage: FC = () => {
	return (
		<SectionPage tabs={TABS} defaultTab="strategy_library">
			{(activeTab: TabKey) => (
				<>
					{activeTab === "strategy_library" && <ResearchStrategyLibraryPage />}
					{activeTab === "framework_source" && <ResearchFrameworkSourcePage />}
				</>
			)}
		</SectionPage>
	)
}

export default ResearchSectionPage
