import { Badge } from "@/renderer/components/ui/badge"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/renderer/components/ui/tooltip"
import { cn } from "@/renderer/lib/utils"
import { ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"

type Props = {
	scaleinTargetsValue: number[]
	delayDuration?: number
	sideOffset?: number
}

export default function ScaleinTargetsView({ scaleinTargetsValue }: Props) {
	const [widthPercentList, setWidthPercentList] = useState<number[]>([])
	const [animated, setAnimated] = useState(false)

	useEffect(() => {
		if (!scaleinTargetsValue?.length) return
		// 从小到大排序,再计算百分比
		let sorted: any = [...scaleinTargetsValue].sort((a, b) => a - b)
		sorted = sorted.map((item: number) => Number((item * 100).toFixed(2)))
		setWidthPercentList(sorted)
		// 延迟触发动画，让条从0%平滑展开
		setAnimated(false)
		const timer = setTimeout(() => setAnimated(true), 50)
		return () => clearTimeout(timer)
	}, [scaleinTargetsValue])

	return (
		<div className="space-y-2">
			{/* 堆叠进度条 */}
			<div className="h-10 relative">
				{widthPercentList.map((value, index) => {
					const textInside = value > 10

					return (
						<div
							key={`${value}-${index}`}
							className={cn(
								"absolute left-0 bottom-0 h-8 rounded-md flex items-center px-2 text-xs text-primary-foreground",
								"bg-primary/30 border border-primary/60 shadow-sm",
								"overflow-hidden",
							)}
							style={{
								width: animated ? `${value}%` : "0%",
								zIndex: widthPercentList.length - index,
								transition: "width 0.8s ease-in-out",
								justifyContent: textInside ? "flex-end" : "flex-start",
							}}
						>
							<TooltipProvider key={`${value}-${index}`}>
								<Tooltip delayDuration={0}>
									<TooltipTrigger asChild>
										<span
											className="whitespace-nowrap cursor-default"
											style={{
												marginLeft: textInside ? undefined : 4,
											}}
										>
											{value}%
										</span>
									</TooltipTrigger>
									<TooltipContent sideOffset={10}>
										仓位{index + 1}：{value}%
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					)
				})}
			</div>

			<div className="text-sm text-muted-foreground flex items-center gap-1">
				{widthPercentList.map((value, index) => (
					<>
						<Badge key={index} variant="secondary">
							仓位{index + 1}（{value}%）
						</Badge>
						{index !== widthPercentList.length - 1 && (
							<ArrowRight className="size-4" />
						)}
					</>
				))}
			</div>
		</div>
	)
}
