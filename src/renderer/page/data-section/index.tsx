import { SectionPage } from "@/renderer/components/section-tabs"
import Data from "@/renderer/page/data"
import RealtimeData from "@/renderer/page/realtime-data"
import { userAtom } from "@/renderer/store/user"
import { checkPermission } from "@/shared/lib/permission"
import { useAtomValue } from "jotai"
import type { FC } from "react"

const TABS = [
	{ key: "history", label: "历史数据" },
	{ key: "realtime", label: "实时数据" },
] as const

type TabKey = (typeof TABS)[number]["key"]

const DataSectionPage: FC = () => {
	const { permissions } = useAtomValue(userAtom)
	const isMember = checkPermission(permissions, "isMember")

	if (!isMember) {
		return (
			<div className="h-full overflow-auto pt-4">
				<Data />
			</div>
		)
	}

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
