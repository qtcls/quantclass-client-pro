import { Badge } from "@/renderer/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/renderer/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/renderer/components/ui/tooltip"
import type { StrategyStatus } from "@/shared/types/strategy-status"
import dayjs from "dayjs"
import { forwardRef, useImperativeHandle, useState } from "react"

export interface StrategyStatusDesDialogRef {
	open: () => void
	close: () => void
}

const StrategyStatusDesDialog = forwardRef<
	StrategyStatusDesDialogRef,
	{
		currentItem: StrategyStatus | null
	}
>(
	(
		{
			currentItem,
		}: {
			currentItem: StrategyStatus | null
		},
		ref,
	) => {
		const [dialogIsOpen, setDialogIsOpen] = useState<boolean>(false)

		// 暴露方法给父组件
		useImperativeHandle(
			ref,
			() => ({
				open: () => setDialogIsOpen(true),
				close: () => setDialogIsOpen(false),
			}),
			[],
		)

		return (
			<Dialog open={dialogIsOpen} onOpenChange={setDialogIsOpen}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>执行详情</DialogTitle>
						<DialogDescription className="pt-2">
							{currentItem?.title ?? "无标题"}的执行批次记录，共
							<span className="font-semibold mx-1">
								{currentItem?.stats?.length || 0}
							</span>
							次
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3 max-h-[60vh] overflow-y-auto">
						{currentItem?.stats?.map((stat, idx) => (
							<Card key={idx} className="border text-sm">
								<CardHeader className="px-3 py-2 border-b">
									<div className="flex items-center justify-between gap-2">
										<div className="flex-1 flex items-center gap-2">
											<Badge variant="outline" className="px-2">
												{idx + 1}
											</Badge>
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<div className="flex-1 truncate cursor-default">
															{stat.timeDes}
														</div>
													</TooltipTrigger>
													<TooltipContent side="bottom">
														<p className="max-w-xs">{stat.timeDes}</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</div>
										{stat?.batchId && currentItem.tag === "DATA_UPDATE" && (
											<Badge
												variant="outline"
												className="text-xs flex-shrink-0"
											>
												自动增量更新
											</Badge>
										)}
									</div>
								</CardHeader>

								<CardContent className="px-4 py-2 space-y-2">
									<div className="flex items-start gap-2">
										<span className=" flex-shrink-0 text-muted-foreground">
											时间：
										</span>
										<div>
											{Array.isArray(stat.time) ? (
												<div className="flex items-center gap-2 font-mono">
													<span className="bg-gray-100 dark:bg-neutral-800/80 px-2 rounded">
														{dayjs(stat.time[0]).format("YYYY-MM-DD HH:mm:ss")}
													</span>
													<span className="text-muted-foreground">至</span>
													<span className="bg-gray-100 dark:bg-neutral-800/80 px-2 rounded">
														{dayjs(stat.time[1]).format("YYYY-MM-DD HH:mm:ss")}
													</span>
												</div>
											) : (
												<span>
													{dayjs(stat.time!).format("YYYY-MM-DD HH:mm:ss")}
												</span>
											)}
										</div>
									</div>

									<div className="flex items-start gap-2 w-full">
										<span className="flex-shrink-0 text-muted-foreground">
											描述：
										</span>
										<span className="flex-1 min-w-0 whitespace-pre-wrap break-all">
											{stat.messages || "---"}
										</span>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</DialogContent>
			</Dialog>
		)
	},
)

StrategyStatusDesDialog.displayName = "StrategyStatusDesDialog"

export default StrategyStatusDesDialog
