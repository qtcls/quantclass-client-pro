/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import intro1 from "@/renderer/assets/member-promo/intro/1.png"
import { INTRO_PROMO_MARKDOWN } from "@/renderer/components/member-promo/content/intro-markdown"
import { MemberPromoMarkdown } from "@/renderer/components/member-promo/promo-markdown"
import { MemberPromoTabPanel } from "@/renderer/components/member-promo/promo-tab-panel"

export function IntroPromoContent() {
	return (
		<MemberPromoTabPanel
			title="分享会介绍"
			images={[{ src: intro1, caption: "邢不行 · 2026 策略分享会" }]}
		>
			<MemberPromoMarkdown content={INTRO_PROMO_MARKDOWN} />
		</MemberPromoTabPanel>
	)
}
