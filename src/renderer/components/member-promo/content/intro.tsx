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
import {
	INTRO_PROMO_LEAD_MARKDOWN,
	INTRO_PROMO_MARKDOWN,
} from "@/renderer/components/member-promo/content/intro-markdown"
import {
	FEN_CLASS_LINKS,
	FEN_CLASS_URL_BY_YEAR,
} from "@/renderer/components/member-promo/constants"
import { MemberPromoMarkdown } from "@/renderer/components/member-promo/promo-markdown"
import { MemberPromoTabPanel } from "@/renderer/components/member-promo/promo-tab-panel"

const FEN_2026 = FEN_CLASS_LINKS.find((item) => item.year === 2026)!

export function IntroPromoContent() {
	const { openUrl } = window.electronAPI

	return (
		<MemberPromoTabPanel
			title="分享会介绍"
			images={[{ src: intro1, caption: "邢不行 · 2026 策略分享会" }]}
		>
			<MemberPromoMarkdown content={INTRO_PROMO_LEAD_MARKDOWN} />
			<div className="flex justify-center py-3">
				<button
					type="button"
					className="rounded-md border border-[#3D4C82] px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
					style={{ backgroundColor: FEN_2026.bg }}
					onClick={() => openUrl(FEN_CLASS_URL_BY_YEAR[2026])}
				>
					立即购买 · {FEN_2026.label}
				</button>
			</div>
			<MemberPromoMarkdown content={INTRO_PROMO_MARKDOWN} />
		</MemberPromoTabPanel>
	)
}
