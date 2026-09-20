/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { cn } from "@/renderer/lib/utils"
import { Crown } from "lucide-react"
import type { ReactNode } from "react"

interface UserAvatarWithCrownProps {
	children: ReactNode
	isLoggedIn: boolean
	isMember: boolean
	size?: "sm" | "md" | "lg"
	className?: string
}

/** 右下角角标，尺寸约为头像直径的 28%（参考 Discord / shadcn Badge 规范） */
const tierBadgeClassName = {
	sm: {
		badge: "size-[9px] -bottom-px -right-px",
		icon: "size-[5px]",
	},
	md: {
		badge: "size-3.5 -bottom-0.5 -right-0.5",
		icon: "size-2",
	},
	lg: {
		badge: "size-3.5 -bottom-0.5 -right-0.5",
		icon: "size-2",
	},
} as const

export function UserAvatarWithCrown({
	children,
	isLoggedIn,
	isMember,
	size = "md",
	className,
}: UserAvatarWithCrownProps) {
	if (!isLoggedIn) return children

	const { badge, icon } = tierBadgeClassName[size]

	return (
		<span className={cn("relative inline-flex shrink-0", className)}>
			{children}
			<span
				aria-hidden
				className={cn(
					"pointer-events-none absolute flex items-center justify-center rounded-full border-[1.5px] border-background shadow-sm",
					badge,
					isMember
						? "bg-amber-400 text-amber-950"
						: "bg-muted text-muted-foreground",
				)}
			>
				<Crown className={cn(icon, "fill-current")} strokeWidth={0} />
			</span>
		</span>
	)
}
