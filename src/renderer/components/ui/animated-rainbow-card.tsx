import { cn } from "@/renderer/lib/utils"
import React from "react"

export const rainbowGradientClassName =
	"bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/20 dark:via-purple-900/40 dark:to-pink-900/50"

export const rainbowBorderClassName = "border-blue-300 dark:border-blue-700"

interface AnimatedRainbowCardProps {
	children?: React.ReactNode
	className?: string
	icon?: React.ReactNode
	title?: string
	description?: string
}

export function AnimatedRainbowCard({
	children,
	className,
	icon,
	title,
	description,
}: AnimatedRainbowCardProps) {
	return (
		<div
			className={cn(
				"relative overflow-hidden border rounded-lg px-4 py-3",
				rainbowGradientClassName,
				rainbowBorderClassName,
				className,
			)}
		>
			{/* 动画闪光效果 */}
			<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent w-1/3 h-full animate-[shimmer_2s_ease-in-out_infinite] transform -skew-x-12" />

			{/* 内容区域 */}
			<div className="relative">
				{(icon || title) && (
					<div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
						{icon && <span className="text-2xl">{icon}</span>}
						{title && <span className="font-medium">{title}</span>}
					</div>
				)}

				{description && (
					<p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
						{description?.split("\n").map((line, index) => (
							<React.Fragment key={index}>
								{line}
								{index < description.split("\n").length - 1 && <br />}
							</React.Fragment>
						))}
					</p>
				)}

				{/* 自定义内容 */}
				{children}
			</div>

			{/* 动画样式 */}
			<style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) skewX(-12deg);
          }
          100% {
            transform: translateX(300%) skewX(-12deg);
          }
        }
      `}</style>
		</div>
	)
}
