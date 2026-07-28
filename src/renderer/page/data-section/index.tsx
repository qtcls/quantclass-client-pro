import { SectionPage } from "@/renderer/components/section-tabs"
import Data from "@/renderer/page/data"
import RealtimeData from "@/renderer/page/realtime-data"
import type { FC } from "react"

const TABS = [
	{ key: "history", label: "历史数据" },
	{ key: "realtime", label: "实时数据" },
] as const

type TabKey = (typeof TABS)[number]["key"]

const DataSectionPage: FC = () => {
	return (
		<SectionPage tabs={TABS} defaultTab="history">
			{(activeTab: TabKey) => (
				<>
					{activeTab === "history" && <Data />}
					{activeTab === "realtime" && <RealtimeData />}
				</>
			)}
		</SectionPage>
	)
}

export default DataSectionPage
