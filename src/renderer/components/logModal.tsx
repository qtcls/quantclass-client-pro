import {
	fuelOutPutAtom,
	realMarketOutputAtom,
	selectStockOutputAtom,
} from "@/renderer/store"
import { useAtom } from "jotai"
import { ExternalLink } from "lucide-react"
import { useState } from "react"
import { LogViewer } from "./logViewer"
import { Button } from "./ui/button"
import { Checkbox } from "./ui/checkbox"
import { Dialog, DialogContent } from "./ui/dialog"
import { Label } from "./ui/label"

interface LogDashboardProps {
	isShowTitle?: boolean
	isShowExternal?: boolean
	textSize?: string
	onClose?: () => void
	isIndependentWindow?: boolean
}

export function LogDashboard({
	isShowTitle = true,
	isShowExternal = true,
	textSize = "text-xs",
	onClose,
	isIndependentWindow = false,
}: LogDashboardProps) {
	const [fuelOutput, setFuelOutput] = useAtom(fuelOutPutAtom)
	const [realMarketOutput, setRealMarketOutput] = useAtom(realMarketOutputAtom)
	const [selectStockOutput, setSelectStockOutput] = useAtom(
		selectStockOutputAtom,
	)

	const [visibleLogs, setVisibleLogs] = useState({
		fuel: true,
		rocket: true,
		select: true,
	})

	const openIndependentWindow = async () => {
		await window.electronAPI.createTerminalWindow()
		onClose?.()
	}

	const activeCount = Object.values(visibleLogs).filter(Boolean).length
	const gridCols =
		activeCount === 1
			? "grid-cols-1"
			: activeCount === 2
				? "grid-cols-2"
				: "grid-cols-3"

	return (
		<div className="flex-1 min-w-0 min-h-0 flex flex-col h-full w-full">
			<div className="px-4 py-2 border-b flex flex-row items-center justify-between bg-background">
				<div className="flex items-center gap-6">
					{isShowTitle && (
						<div className="text-lg font-semibold leading-none tracking-tight">
							系统日志
						</div>
					)}
					<div className="flex items-center gap-4">
						<div className="flex items-center space-x-2">
							<Checkbox
								id="fuel-log"
								checked={visibleLogs.fuel}
								disabled={activeCount === 1 && visibleLogs.fuel}
								onCheckedChange={(checked) =>
									setVisibleLogs((prev) => ({
										...prev,
										fuel: checked === true,
									}))
								}
							/>
							<Label htmlFor="fuel-log" className="text-sm font-normal">
								数据更新日志
							</Label>
						</div>
						<div className="flex items-center space-x-2">
							<Checkbox
								id="rocket-log"
								checked={visibleLogs.rocket}
								disabled={activeCount === 1 && visibleLogs.rocket}
								onCheckedChange={(checked) =>
									setVisibleLogs((prev) => ({
										...prev,
										rocket: checked === true,
									}))
								}
							/>
							<Label htmlFor="rocket-log" className="text-sm font-normal">
								选股日志
							</Label>
						</div>
						<div className="flex items-center space-x-2">
							<Checkbox
								id="select-log"
								checked={visibleLogs.select}
								disabled={activeCount === 1 && visibleLogs.select}
								onCheckedChange={(checked) =>
									setVisibleLogs((prev) => ({
										...prev,
										select: checked === true,
									}))
								}
							/>
							<Label htmlFor="select-log" className="text-sm font-normal">
								实盘日志
							</Label>
						</div>
					</div>
				</div>
				{isShowExternal && (
					<Button
						variant="ghost"
						size="sm"
						className="gap-2 mr-8"
						onClick={openIndependentWindow}
					>
						<ExternalLink className="h-4 w-4" />
						独立窗口
					</Button>
				)}
			</div>
			<div
				className={`flex-1 grid ${gridCols} gap-0 min-h-0 divide-x transition-all`}
			>
				{visibleLogs.fuel && (
					<LogViewer
						title="数据更新日志"
						htmlContent={fuelOutput}
						onChange={setFuelOutput}
						key="fuel"
						logType="fuel"
						customClass={textSize}
					/>
				)}

				{visibleLogs.rocket && (
					<LogViewer
						title="选股日志"
						htmlContent={realMarketOutput}
						onChange={setRealMarketOutput}
						key="rocket"
						logType="rocket"
						customClass={textSize}
					/>
				)}

				{visibleLogs.select && (
					<LogViewer
						title="实盘日志"
						htmlContent={selectStockOutput}
						onChange={setSelectStockOutput}
						key="select"
						logType="select"
						customClass={textSize}
					/>
				)}
			</div>
		</div>
	)
}

interface LogModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function LogModal({ open, onOpenChange }: LogModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="max-w-[90vw] h-[80vh] flex flex-col p-0 gap-0"
				aria-describedby={undefined}
			>
				<LogDashboard onClose={() => onOpenChange(false)} />
			</DialogContent>
		</Dialog>
	)
}
