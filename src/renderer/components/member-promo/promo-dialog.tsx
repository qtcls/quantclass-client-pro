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
import { IntroPromoContent } from "@/renderer/components/member-promo/content/intro"
import { RandomStrategyPromoContent } from "@/renderer/components/member-promo/content/random-strategy"
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
	memberPromoTabBarClassName,
} from "@/renderer/components/member-promo/theme"
import { SectionTabs } from "@/renderer/components/section-tabs"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { cn } from "@/renderer/lib/utils"
import { Sparkles } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

interface MemberPromoDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	featureName?: string
	description?: string
}

function MemberPromoTabBody({ id }: { id: MemberPromoTabId }) {
	if (id === "intro") return <IntroPromoContent />
	if (id === "random-strategy") return <RandomStrategyPromoContent />
	if (id === "config-master") return <ConfigMasterPromoContent />
	if (id === "blacklist") return <BlacklistPromoContent />
	if (id === "fusion-library") return <FusionLibraryPromoContent />
	if (id === "exclusive") return <ExclusivePromoContent />

	return null
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

	const sectionTabs = useMemo(
		() => MEMBER_PROMO_TABS.map((tab) => ({ key: tab.id, label: tab.label })),
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
						<div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-4 pt-3">
							<div className={cn(memberPromoHeaderClassName, "pr-8")}>
								<div className={memberPromoIconBadgeClassName}>
									<Sparkles
										className="size-3.5 text-violet-500"
										strokeWidth={1.75}
									/>
								</div>
								<span className="text-sm font-semibold">分享会专享功能</span>
							</div>

							<SectionTabs
								tabs={sectionTabs}
								value={activeTab}
								onValueChange={(value) =>
									setActiveTab(value as MemberPromoTabId)
								}
								className={memberPromoTabBarClassName}
							/>

							<div className={memberPromoContentPanelClassName}>
								<MemberPromoTabBody id={activeTab} />
							</div>
						</div>
					</MemberPromoTabNavContext.Provider>
				</div>
			</DialogContent>
		</Dialog>
	)
}
