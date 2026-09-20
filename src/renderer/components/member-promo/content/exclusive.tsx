/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import exclusive1 from "@/renderer/assets/member-promo/exclusive/1.png"
import exclusive2 from "@/renderer/assets/member-promo/exclusive/2.png"
import exclusive3 from "@/renderer/assets/member-promo/exclusive/3.png"
import {
	FEN_CLASS_LINKS,
	FEN_CLASS_URL_BY_YEAR,
} from "@/renderer/components/member-promo/constants"
import { MemberPromoTabPanel } from "@/renderer/components/member-promo/promo-tab-panel"
import { useMemberPromoTabNav } from "@/renderer/components/member-promo/tab-nav-context"
import type { MemberPromoTabId } from "@/renderer/components/member-promo/tabs"
import { memberPromoMutedTextClassName } from "@/renderer/components/member-promo/theme"

function PromoInternalLink({
	tabId,
	children,
}: {
	tabId: MemberPromoTabId
	children: string
}) {
	const tabNav = useMemberPromoTabNav()

	return (
		<button
			type="button"
			className="text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
			onClick={() => tabNav?.goToTab(tabId)}
		>
			{children}
		</button>
	)
}

export function ExclusivePromoContent() {
	const { openUrl } = window.electronAPI

	return (
		<MemberPromoTabPanel
			title="分享会策略专属功能"
			images={[
				{ src: exclusive1, caption: "分享会专属功能—个股择时示例图" },
				{ src: exclusive2, caption: "分享会专属功能—后置过滤示例图" },
				{ src: exclusive3, caption: "分享会专属功能—择时开仓/离场示例图" },
			]}
		>
			<section className="space-y-2">
				<h3 className="font-semibold">分享会策略专属功能全解</h3>
				<p>
					一个长期稳定的全天候策略，绝不仅仅是“选股公式”那么简单，它必须是一套从选股、过滤、择时（或轮动）到执行的完美闭环。分享会经过多年的发展，已经形成了一整套成熟完整的框架体系，能满足市面上绝大部分的策略需求！其中就有五大专属核心功能，也正是这些硬核武器，才能让风火轮、凌烟阁、定风波等旗舰策略在实战中大放异彩！
				</p>
			</section>

			<section className="mt-5 space-y-2">
				<h3 className="font-semibold">后置过滤因子功能</h3>
				<p>
					后置过滤是在策略已经得出选股结果之后，再进行“二次安检”，满足条件的留下，不满足条件的直接剔除。它和前置过滤（stock-quant-dev
					框架中的 filter_list）在作用时点和仓位效果上有着本质区别：
				</p>
				<ol className="list-decimal space-y-2 pl-5">
					<li>
						<span className="font-medium">前置过滤：</span>
						在选股前先把不符合条件的股票剔除，然后在剩下的池子里正常选股。比如你有10万元，计划选10只，每只分配1万元。前置过滤后，只要剩余股票数量足够，你依然会选满10只，最终仓位接近100%。
					</li>
					<li>
						<span className="font-medium">后置过滤：</span>
						在策略已经选出10只之后，再逐一检查。假设其中3只不满足条件被剔除，那么最终只买入剩下的7只。由于每只仍然按照1万元的预算分配，总买入金额就只有7万元，仓位自然降到70%。
					</li>
				</ol>
				<p>
					所以，后置过滤不只是单纯“剔除坏股票”，更是一个仓位调节器：当市场质量高时能让策略奔跑；达标股票少时，也能自动降低仓位、控制回撤。达到过滤杂质、留下精华、控制仓位、守住利润的多重效果。
				</p>
			</section>

			<section className="mt-5 space-y-2">
				<h3 className="font-semibold">截面因子功能</h3>
				<p>
					截面因子是指在同一个时间点上，横向获取全市场所有股票的信息，然后对某个指标进行横向比较，构建出排名、分位数或标准化得分等结果的因子。如：
				</p>
				<ul className="list-disc space-y-1 pl-5">
					<li>当前净利润增速在全市场的排名；</li>
					<li>当前换手率在全市场的分位；</li>
					<li>当前市值在全市场的标准化得分。</li>
				</ul>
			</section>

			<section className="mt-5 space-y-2">
				<h3 className="font-semibold">个股择时功能</h3>
				<p>
					这是专为26分享会旗舰策略「凌烟阁」量身定制的强大功能！它能在选股的基础上对策略选出的每一只个股进行独立判断，根据市场行情自动匹配适合的择时策略。（详见：
					<PromoInternalLink tabId="fusion-library">
						策略库—选股策略精心随机
					</PromoInternalLink>
					）
				</p>
				<p>
					市场周期变幻莫测，个股股性千差万别。个股择时因子就像给每只股票配了一个专属操盘手，自动判断进场、出场时机。无论市场走到哪个阶段，都能精准做出判断，省心省力，再也不用天天盯盘。
				</p>
			</section>

			<section className="mt-5 space-y-2">
				<h3 className="font-semibold">择时开仓/离场功能</h3>
				<p>
					这是25分享会旗舰策略「定风波」的精髓。它不针对单只股票，而是对整个选股策略进行全局择时，判断当前市场环境是否适合开仓（买入），或者是否应该离场（清仓）。（详见：
					<PromoInternalLink tabId="fusion-library">
						策略库—选股精心随机混合
					</PromoInternalLink>
					）
				</p>
				<p>
					不再是盲目持有到下一个换仓周期，一条路走到黑。而是能在熊市或大跌前夕果断离场保住利润，牛市或反弹又能精准开仓猛踩油门。让你的策略稳步增长，不再坐过山车。
				</p>
			</section>

			<section className="mt-5 space-y-2">
				<h3 className="font-semibold">50+种换仓时间点</h3>
				<p>
					分享会支持交易日全天50+种换仓时间灵活配置，把全天4小时的交易时间按5分钟划分，如：0930、1025、1435...避免拥挤，拒绝滑点！
					正如我们“精心随机（详见：
					<PromoInternalLink tabId="random-strategy">
						精心随机策略库
					</PromoInternalLink>
					）”诞生的初衷，如果大家都用同一策略在同一时间换仓，必然导致成交量剧增、滑点拉大，甚至被主力反向收割。通过换仓时间点的灵活配置，可以让交易指令化整为零，降低系统冲击成本，提升策略容量。
				</p>
			</section>

			<section className="mt-6 space-y-2 text-center">
				<p className={memberPromoMutedTextClassName}>[ 了解分享会 ↓↓↓ ]</p>
				<div className="flex flex-wrap items-center justify-center gap-3 pb-1 pt-1">
					{FEN_CLASS_LINKS.map(({ year, label, bg }) => (
						<button
							key={year}
							type="button"
							className="rounded-md border border-[#3D4C82] px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
							style={{ backgroundColor: bg }}
							onClick={() => openUrl(FEN_CLASS_URL_BY_YEAR[year])}
						>
							{label}
						</button>
					))}
				</div>
			</section>
		</MemberPromoTabPanel>
	)
}
