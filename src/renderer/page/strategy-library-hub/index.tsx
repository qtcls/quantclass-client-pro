import { BacktestDialog } from "@/renderer/components/backtest-dialog"
import { ChangeLibrary } from "@/renderer/components/change-library"
import {
	MemberPromoBanner,
	MemberPromoDialog,
	MemberPromoGate,
} from "@/renderer/components/member-promo"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/renderer/components/ui/select"
import { useSettings } from "@/renderer/hooks/useSettings"
import StrategyLibrary from "@/renderer/page/library"
import FusionStrategyLibrary from "@/renderer/page/library/fusion"
import { userAtom } from "@/renderer/store/user"
import { checkPermission } from "@/shared/lib/permission"
import { useAtomValue } from "jotai"
import { useState } from "react"

type LibraryView = "fusion" | "select"

function libraryTypeToView(libraryType: string): LibraryView {
	return libraryType === "select" ? "select" : "fusion"
}

const FUSION_LIBRARY_FEATURE = "综合策略库"

export default function StrategyLibraryHub() {
	const { settings } = useSettings()
	const { permissions } = useAtomValue(userAtom)
	const isMember = checkPermission(permissions, "isMember")
	const [libraryView, setLibraryView] = useState<LibraryView>(() =>
		isMember ? libraryTypeToView(settings.libraryType) : "select",
	)
	const [promoOpen, setPromoOpen] = useState(false)

	const isFusionLocked = libraryView === "fusion" && !isMember

	return (
		<div className="h-full flex flex-col space-y-3">
			<div className="flex items-center gap-3">
				<div className="w-52 shrink-0">
					<Select
						value={libraryView}
						onValueChange={(value) => setLibraryView(value as LibraryView)}
					>
						<SelectTrigger>
							<SelectValue placeholder="请选择策略库" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="fusion">策略库</SelectItem>
							<SelectItem value="select">策略库（选股）</SelectItem>
						</SelectContent>
					</Select>
				</div>
				{isFusionLocked ? (
					<MemberPromoBanner
						featureName={FUSION_LIBRARY_FEATURE}
						className="flex-1 min-w-0"
						onLearnMore={() => setPromoOpen(true)}
					/>
				) : (
					<ChangeLibrary
						currentLibraryType={libraryView === "fusion" ? "pos" : "select"}
					/>
				)}
			</div>

			<div className="min-h-0 flex-1">
				{libraryView === "fusion" ? (
					<MemberPromoGate
						featureName={FUSION_LIBRARY_FEATURE}
						showBanner={false}
						className="h-full"
					>
						<FusionStrategyLibrary />
					</MemberPromoGate>
				) : (
					<StrategyLibrary />
				)}
			</div>
			<BacktestDialog />
			<MemberPromoDialog
				open={promoOpen}
				onOpenChange={setPromoOpen}
				featureName={FUSION_LIBRARY_FEATURE}
			/>
		</div>
	)
}
