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

/** 分享会渐变背景 */
export const memberPromoGradientClassName =
	"bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/20 dark:via-purple-900/40 dark:to-pink-900/50"

/** 分享会边框色 */
export const memberPromoBorderClassName = "border-blue-300 dark:border-blue-700"

export const memberPromoTextClassName = "text-blue-900 dark:text-blue-200"

export const memberPromoBodyTextClassName =
	"text-blue-950/90 dark:text-blue-100/90"

export const memberPromoMutedTextClassName =
	"text-blue-800/70 dark:text-blue-200/70"

export const memberPromoTitleClassName = "text-blue-900 dark:text-blue-100"

export const memberPromoDialogClassName = cn(
	"h-[min(42rem,85vh)] max-h-[85vh] w-[min(56rem,calc(100vw-2rem))] !max-w-4xl",
	"!gap-0 !border-0 !bg-transparent !p-0 shadow-none",
	"[&>button]:z-20",
)

export const memberPromoDialogInnerClassName = cn(
	"relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border shadow-xl",
	memberPromoGradientClassName,
	memberPromoBorderClassName,
)

export const memberPromoHeaderClassName = cn(
	"mb-2 flex shrink-0 items-center gap-2",
	memberPromoTextClassName,
)

export const memberPromoContentPanelClassName =
	"min-h-0 flex-1 overflow-hidden rounded-lg border border-blue-200/70 bg-white/90 p-4 shadow-sm dark:border-blue-800/50 dark:bg-background/90"

export const memberPromoTabBarClassName = cn(
	"-mx-1 shrink-0 border-border bg-transparent pr-10",
	"[&>div]:flex-nowrap [&>div]:overflow-x-auto [&>div]:overflow-y-hidden [&>div]:px-0",
	"[&_button.border-foreground]:!bg-transparent [&_button.border-foreground]:!border-b-[3px] [&_button.border-foreground]:-mb-px",
)

export const memberPromoIconBadgeClassName = cn(
	"flex size-7 shrink-0 items-center justify-center rounded-full border bg-white/80 dark:bg-background/80",
	memberPromoBorderClassName,
)

export const memberPromoCarouselFrameClassName =
	"overflow-hidden rounded-lg border border-blue-200/60 bg-blue-50/30 p-2 dark:border-blue-800/50 dark:bg-blue-950/20"

export const memberPromoCarouselPlaceholderClassName = cn(
	"flex h-56 items-center justify-center rounded-lg border border-dashed border-blue-200/60 bg-blue-50/30 text-sm",
	memberPromoMutedTextClassName,
)

export const memberPromoFooterButtonClassName = cn(
	"rounded-full border bg-white/90 px-5 py-1.5 text-sm font-semibold shadow-sm transition-colors hover:bg-white",
	memberPromoTextClassName,
	"dark:bg-background/90 dark:hover:bg-background",
	memberPromoBorderClassName,
)

export const memberPromoBannerClassName = cn(
	"relative inline-flex h-9 w-fit max-w-full items-center gap-2 overflow-hidden rounded-full border px-3",
	memberPromoGradientClassName,
	memberPromoBorderClassName,
)

export const memberPromoShimmerOverlayClassName =
	"pointer-events-none absolute inset-y-0 left-0 z-0 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/55 to-transparent animate-[member-promo-shimmer_2s_ease-in-out_infinite] dark:via-white/10"

export const memberPromoBannerLinkClassName =
	"relative z-10 shrink-0 text-sm font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
