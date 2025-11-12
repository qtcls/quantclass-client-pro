import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/renderer/components/ui/tooltip" // 替换成你实际路径
import { cn } from "@/renderer/lib/utils"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

type Props = {
	scaleinTargetsValue: number[]
	delayDuration?: number
	sideOffset?: number
}

export default function ScaleinTargetsView({ scaleinTargetsValue }: Props) {
	const [widthPercentList, setWidthPercentList] = useState<number[]>([])
	const [animated, setAnimated] = useState(false)
	const { resolvedTheme: mode } = useTheme()

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

	// 生成背景色
	const getBgColor = (index: number) => {
		const num = mode === "dark" ? 40 : 60
		const lightness = num - index * 8
		return `hsl(0 0% ${lightness}%)`
	}

	return (
		<div className="space-y-2">
			{/* 堆叠进度条 */}
			<div className="h-10 relative">
				{widthPercentList.map((value, index) => {
					const bgColor = getBgColor(index)
					const textInside = value > 10

					return (
						<div
							key={`${value}-${index}`}
							className={cn(
								"absolute left-0 bottom-0 h-8 rounded-md flex items-center px-2 text-xs text-foreground",
								"overflow-hidden",
							)}
							style={{
								width: animated ? `${value}%` : "0%",
								backgroundColor: bgColor,
								zIndex: widthPercentList.length - index,
								transition: "width 0.8s ease-in-out",
								justifyContent: textInside ? "flex-end" : "flex-start",
							}}
						>
							<TooltipProvider key={`${value}-${index}`}>
								<Tooltip>
									<TooltipTrigger asChild>
										<span
											className="whitespace-nowrap cursor-default text-white"
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

			<div className="text-sm text-muted-foreground font-mono">
				{widthPercentList.map((value, index) => (
					<span key={index}>
						<span className="bg-muted/30 px-1.5 py-0.5 rounded">
							仓位{index + 1}（{value}%）
						</span>
						{index !== widthPercentList.length - 1 && " → "}
					</span>
				))}
			</div>
		</div>
	)
}
