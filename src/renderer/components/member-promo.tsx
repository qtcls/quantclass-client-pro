/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import {
	rainbowBorderClassName,
	rainbowGradientClassName,
} from "@/renderer/components/ui/animated-rainbow-card"
import { Button } from "@/renderer/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { cn } from "@/renderer/lib/utils"
import { userAtom } from "@/renderer/store/user"
import { checkPermission } from "@/shared/lib/permission"
import { useAtomValue } from "jotai"
import { Sparkles } from "lucide-react"
import type { ReactNode, SyntheticEvent } from "react"
import { useState } from "react"

export const FEN_CLASS_URL = "https://www.quantclass.cn/fen/class/fen-2025"

const DEFAULT_FEATURE = "本功能"

const memberPromoButtonClassName = cn(
	"shrink-0 bg-white/80 text-blue-900 hover:bg-white hover:text-blue-900",
	"dark:bg-background/80 dark:text-blue-200 dark:hover:bg-background dark:hover:text-blue-200",
	rainbowBorderClassName,
)

function getMemberPromoDescription(featureName?: string, description?: string) {
	if (description) return description

	const name = featureName ?? DEFAULT_FEATURE
	return `${name}暂时仅限策略分享会同学使用`
}

interface MemberPromoDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	featureName?: string
	description?: string
}

interface MemberPromoBannerProps {
	featureName: string
	className?: string
	onLearnMore?: () => void
}

interface MemberPromoGateProps {
	children: ReactNode
	featureName: string
	className?: string
	showBanner?: boolean
	bannerClassName?: string
}

const MEMBER_INTERACTIVE_SELECTOR =
	"button, a, [role='button'], input, select, textarea, [data-member-action]"

export function MemberPromoDialog({
	open,
	onOpenChange,
	featureName,
	description,
}: MemberPromoDialogProps) {
	const { openUrl } = window.electronAPI
	const promoDescription = getMemberPromoDescription(featureName, description)

	const handleLearnMore = () => {
		openUrl(FEN_CLASS_URL)
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={cn(
					"max-w-sm gap-0 overflow-hidden border p-0 shadow-xl sm:rounded-2xl",
					rainbowGradientClassName,
					rainbowBorderClassName,
				)}
			>
				<div className="flex flex-col items-center px-6 pb-6 pt-10 text-center">
					<div
						className={cn(
							"mb-5 flex size-16 items-center justify-center rounded-full border bg-white/90 dark:bg-background/90",
							rainbowBorderClassName,
						)}
					>
						<Sparkles className="size-8 text-violet-500" strokeWidth={1.75} />
					</div>

					<DialogTitle className="mb-2 text-xl font-bold text-blue-900 dark:text-blue-200">
						分享会专享功能
					</DialogTitle>

					<DialogDescription className="mb-8 text-sm leading-relaxed text-blue-800 dark:text-blue-300">
						{promoDescription}
					</DialogDescription>

					<Button
						variant="outline"
						className={cn("h-11 w-full rounded-xl", memberPromoButtonClassName)}
						onClick={handleLearnMore}
					>
						了解分享会
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}

export function MemberPromoBanner({
	featureName,
	className,
	onLearnMore,
}: MemberPromoBannerProps) {
	return (
		<div
			className={cn(
				"flex h-10 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border px-3.5",
				rainbowGradientClassName,
				rainbowBorderClassName,
				className,
			)}
		>
			<div className="flex min-w-0 items-center gap-2 text-sm text-blue-900 dark:text-blue-200">
				<div
					className={cn(
						"flex size-7 shrink-0 items-center justify-center rounded-full border bg-white/90 dark:bg-background/90",
						rainbowBorderClassName,
					)}
				>
					<Sparkles className="size-4 text-violet-500" strokeWidth={1.75} />
				</div>
				<span className="truncate font-medium">{featureName} · 分享会专享</span>
			</div>

			<Button
				variant="outline"
				size="sm"
				className={cn("h-8 shrink-0 px-3 text-sm", memberPromoButtonClassName)}
				onClick={onLearnMore}
			>
				了解分享会
			</Button>
		</div>
	)
}

/** 非分享会用户：内容可见，点击交互统一弹分享会窗 */
export function MemberPromoGate({
	children,
	featureName,
	className,
	showBanner = true,
	bannerClassName,
}: MemberPromoGateProps) {
	const { permissions } = useAtomValue(userAtom)
	const isMember = checkPermission(permissions, "isMember")
	const [promoOpen, setPromoOpen] = useState(false)

	if (isMember) return <>{children}</>

	function interceptMemberAction(event: SyntheticEvent) {
		const target = event.target as HTMLElement
		if (!target.closest(MEMBER_INTERACTIVE_SELECTOR)) return

		event.preventDefault()
		event.stopPropagation()
		setPromoOpen(true)
	}

	return (
		<>
			{showBanner && (
				<MemberPromoBanner
					featureName={featureName}
					className={cn("mb-3", bannerClassName)}
					onLearnMore={() => setPromoOpen(true)}
				/>
			)}
			<div
				className={cn("relative", className)}
				onClickCapture={interceptMemberAction}
			>
				{children}
			</div>
			<MemberPromoDialog
				open={promoOpen}
				onOpenChange={setPromoOpen}
				featureName={featureName}
			/>
		</>
	)
}
