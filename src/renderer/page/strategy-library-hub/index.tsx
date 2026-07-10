import { BacktestDialog } from "@/renderer/components/backtest-dialog"
import { ChangeLibrary } from "@/renderer/components/change-library"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/renderer/components/ui/select"
import { useSettings } from "@/renderer/hooks/useSettings"
import FusionStrategyLibrary from "@/renderer/page/library/fusion"
import StrategyLibrary from "@/renderer/page/library"
import { useState } from "react"

type LibraryView = "fusion" | "select"

function libraryTypeToView(libraryType: string): LibraryView {
	return libraryType === "select" ? "select" : "fusion"
}

export default function StrategyLibraryHub() {
	const { settings } = useSettings()
	const [libraryView, setLibraryView] = useState<LibraryView>(() =>
		libraryTypeToView(settings.libraryType),
	)

	return (
		<div className="h-full flex flex-col space-y-3">
			<div className="flex items-center gap-3">
				<div className="w-52">
					<Select
						value={libraryView}
						onValueChange={(value) => setLibraryView(value as LibraryView)}
					>
						<SelectTrigger>
							<SelectValue placeholder="请选择策略库" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="fusion">综合策略库</SelectItem>
							<SelectItem value="select">选股策略</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<ChangeLibrary
					currentLibraryType={libraryView === "fusion" ? "pos" : "select"}
				/>
			</div>

			<div className="min-h-0 flex-1">
				{libraryView === "fusion" ? <FusionStrategyLibrary /> : <StrategyLibrary />}
			</div>
			<BacktestDialog />
		</div>
	)
}
