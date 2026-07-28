import StrategyRun from "@/renderer/page/backtest"
import { atom, useAtom } from "jotai"
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog"

const backtestDialogOpenAtom = atom(false)

export function useBacktestDialog() {
	const [open, setOpen] = useAtom(backtestDialogOpenAtom)

	return {
		open,
		setOpen,
		openBacktest: () => setOpen(true),
		closeBacktest: () => setOpen(false),
	}
}

export function BacktestDialog() {
	const { open, setOpen } = useBacktestDialog()

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="max-w-[90vw] h-[85vh] p-0">
				<DialogTitle className="sr-only">回测</DialogTitle>
				<div className="h-full overflow-hidden rounded-md">
					<StrategyRun />
				</div>
			</DialogContent>
		</Dialog>
	)
}
