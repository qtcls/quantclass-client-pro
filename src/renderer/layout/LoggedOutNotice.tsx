/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { GlowDot } from "@/renderer/components/ui/glow-dot"
import { useOpenLoginWindow } from "@/renderer/layout/hooks/useOpenLoginWindow"
import { cn } from "@/renderer/lib/utils"
import { userAtom } from "@/renderer/store/user"
import { useAtomValue } from "jotai"

const bannerClass =
	"w-full shrink-0 border-b border-amber-300/80 bg-amber-100 px-4 py-2.5 text-left text-amber-950 transition-colors dark:border-amber-700/60 dark:bg-amber-950/35 dark:text-amber-50"

const interactiveBannerClass =
	"hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 dark:hover:bg-amber-950/45 dark:focus-visible:ring-amber-400/50"

/** 面包屑下方未登录提示 */
export function MainLoggedOutBanner() {
	const { isLoggedIn } = useAtomValue(userAtom)
	const { requestLogin, canOpenLogin } = useOpenLoginWindow()

	if (isLoggedIn) return null

	return (
		<button
			type="button"
			className={cn(
				bannerClass,
				canOpenLogin && interactiveBannerClass,
				!canOpenLogin && "cursor-not-allowed opacity-80",
			)}
			disabled={!canOpenLogin}
			onClick={requestLogin}
		>
			<div className="min-w-0 flex-1 text-sm leading-snug">
				<div className="relative w-fit max-w-full">
					<span className="font-semibold leading-snug">
						当前未登录或登录已失效
					</span>
					<GlowDot
						color="red"
						size="sm"
						visible
						className="absolute -top-0.5 -right-4"
					/>
				</div>
				<p className="text-xs text-amber-900/85 dark:text-amber-100/80">
					云端数据、实盘与会员能力将不可用
				</p>
				<p className="mt-1 text-xs font-medium text-amber-900 dark:text-amber-100">
					点击立即登录
				</p>
			</div>
		</button>
	)
}

/** 侧栏底部未登录提示 */
export function SidebarLoggedOutStripe() {
	const { isLoggedIn } = useAtomValue(userAtom)
	const { requestLogin, canOpenLogin } = useOpenLoginWindow()

	if (isLoggedIn) return null

	return (
		<button
			type="button"
			className={cn(
				"shrink-0 w-full border-t border-amber-300/80 bg-amber-100 px-2 py-2 text-left transition-colors dark:border-amber-700/60 dark:bg-amber-950/35",
				canOpenLogin &&
					"hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500/60 dark:hover:bg-amber-950/45 dark:focus-visible:ring-amber-400/50",
				!canOpenLogin && "cursor-not-allowed opacity-80",
			)}
			disabled={!canOpenLogin}
			onClick={requestLogin}
		>
			<div className="rounded-md px-1.5 py-1 text-xs text-amber-950 dark:text-amber-50">
				<div className="relative w-fit max-w-full">
					<span className="font-semibold leading-snug">未登录</span>
					<GlowDot
						color="red"
						size="sm"
						visible
						className="absolute -top-0.5 -right-4"
					/>
				</div>
				<span className="mt-0.5 block font-normal leading-snug text-amber-900/90 dark:text-amber-100/85">
					点击立即登录
				</span>
			</div>
		</button>
	)
}
