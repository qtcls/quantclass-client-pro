import { BacktestDialog } from "@/renderer/components/backtest-dialog"
import BasicStrategyLibrary from "@/renderer/page/library/basic"
import FusionStrategyLibrary from "@/renderer/page/library/fusion"
import { userAtom } from "@/renderer/store/user"
import { checkPermission } from "@/shared/lib/permission"
import { useAtomValue } from "jotai"

export default function StrategyLibraryHub() {
	const { permissions } = useAtomValue(userAtom)
	const isMember = checkPermission(permissions, "isMember")

	return (
		<div className="h-full flex flex-col space-y-3">
			<div className="min-h-0 flex-1">
				{isMember ? <FusionStrategyLibrary /> : <BasicStrategyLibrary />}
			</div>
			<BacktestDialog />
		</div>
	)
}
