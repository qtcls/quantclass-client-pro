/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { BlacklistPromoContent } from "@/renderer/components/member-promo/content/blacklist"
import { ConfigMasterPromoContent } from "@/renderer/components/member-promo/content/config-master"
import { ExclusivePromoContent } from "@/renderer/components/member-promo/content/exclusive"
import { FusionLibraryPromoContent } from "@/renderer/components/member-promo/content/fusion-library"
import { RandomStrategyPromoContent } from "@/renderer/components/member-promo/content/random-strategy"
import {
	MemberPromoPlaceholderBody,
	MemberPromoTabPanel,
} from "@/renderer/components/member-promo/promo-tab-panel"
import { MemberPromoTabNavContext } from "@/renderer/components/member-promo/tab-nav-context"
import {
	MEMBER_PROMO_TABS,
	type MemberPromoTabId,
	getMemberPromoTabId,
} from "@/renderer/components/member-promo/tabs"
import {
	memberPromoContentPanelClassName,
	memberPromoDialogClassName,
	memberPromoDialogInnerClassName,
	memberPromoHeaderClassName,
	memberPromoIconBadgeClassName,
	memberPromoShimmerOverlayClassName,
	memberPromoTabClassName,
} from "@/renderer/components/member-promo/theme"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/renderer/components/ui/tabs"
import { cn } from "@/renderer/lib/utils"
import { Sparkles } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

interface MemberPromoDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	featureName?: string
	description?: string
}

function MemberPromoTabBody({
	id,
	label,
}: {
	id: MemberPromoTabId
	label: string
}) {
	if (id === "random-strategy") return <RandomStrategyPromoContent />
	if (id === "config-master") return <ConfigMasterPromoContent />
	if (id === "blacklist") return <BlacklistPromoContent />
	if (id === "fusion-library") return <FusionLibraryPromoContent />
	if (id === "exclusive") return <ExclusivePromoContent />

	return (
		<MemberPromoTabPanel title={label}>
			<MemberPromoPlaceholderBody />
		</MemberPromoTabPanel>
	)
}

export function MemberPromoDialog({
	open,
	onOpenChange,
	featureName,
}: MemberPromoDialogProps) {
	const mappedTab = getMemberPromoTabId(featureName)
	const [activeTab, setActiveTab] = useState<MemberPromoTabId>(mappedTab)

	useEffect(() => {
		if (open) setActiveTab(mappedTab)
	}, [open, mappedTab])

	const tabNav = useMemo(
		() => ({
			goToTab: (tabId: MemberPromoTabId) => setActiveTab(tabId),
		}),
		[],
	)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className={memberPromoDialogClassName}>
				<DialogTitle className="sr-only">分享会专享功能</DialogTitle>
				<DialogDescription className="sr-only">
					了解策略分享会专属功能
				</DialogDescription>

				<div className={memberPromoDialogInnerClassName}>
					<div aria-hidden className={memberPromoShimmerOverlayClassName} />

					<MemberPromoTabNavContext.Provider value={tabNav}>
						<Tabs
							value={activeTab}
							onValueChange={(value) => setActiveTab(value as MemberPromoTabId)}
							className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-4 pt-3"
						>
							<div className={cn(memberPromoHeaderClassName, "pr-8")}>
								<div className={memberPromoIconBadgeClassName}>
									<Sparkles
										className="size-3.5 text-violet-500"
										strokeWidth={1.75}
									/>
								</div>
								<span className="text-sm font-semibold">分享会专享功能</span>
							</div>

							<TabsList className="h-auto w-full shrink-0 items-end justify-start gap-0 overflow-x-auto bg-transparent p-0">
								{MEMBER_PROMO_TABS.map((tab) => (
									<TabsTrigger
										key={tab.id}
										value={tab.id}
										className={memberPromoTabClassName}
									>
										{tab.label}
									</TabsTrigger>
								))}
							</TabsList>

							<div className={memberPromoContentPanelClassName}>
								{MEMBER_PROMO_TABS.map((tab) => (
									<TabsContent
										key={tab.id}
										value={tab.id}
										className="mt-0 h-full min-h-0 focus-visible:ring-0"
									>
										<MemberPromoTabBody id={tab.id} label={tab.label} />
									</TabsContent>
								))}
							</div>
						</Tabs>
					</MemberPromoTabNavContext.Provider>
				</div>
			</DialogContent>
		</Dialog>
	)
}
