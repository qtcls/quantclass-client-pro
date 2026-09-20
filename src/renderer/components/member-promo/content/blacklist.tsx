/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import blacklist1 from "@/renderer/assets/member-promo/blacklist/1.png"
import blacklist2 from "@/renderer/assets/member-promo/blacklist/2.png"
import {
	FEN_CLASS_LINKS,
	FEN_CLASS_URL_BY_YEAR,
} from "@/renderer/components/member-promo/constants"
import { MemberPromoTabPanel } from "@/renderer/components/member-promo/promo-tab-panel"
import { memberPromoMutedTextClassName } from "@/renderer/components/member-promo/theme"

export function BlacklistPromoContent() {
	const { openUrl } = window.electronAPI

	return (
		<MemberPromoTabPanel
			title="条件黑名单"
			images={[
				{ src: blacklist1, caption: "条件黑名单 — 选择条件" },
				{ src: blacklist2, caption: "条件黑名单 — 设置条件阈值" },
			]}
		>
			<section className="space-y-2">
				<h3 className="font-semibold">一、什么是买入黑名单？</h3>
				<p>
					在量化交易实战中，大家往往会投入大量精力在研究“如何选出好股票”上，却常常忽略了一个致命问题——如何避开那些
					<span className="font-bold text-danger">“坑”</span>
					股票。
				</p>
				<p>
					买入黑名单就是实盘交易时的“一票否决”机制，哪怕策略选中且择时信号为开仓，实盘交易时也不会买入。它能有效帮你规避两类股票：一是存在
					<span className="font-medium">潜在暴雷风险</span>
					的股票，二是策略经常选到、但实战中不产生收益的
					<span className="font-medium">“渣男”</span>
					股。
				</p>
			</section>

			<section className="mt-5 space-y-2">
				<h3 className="font-semibold">二、什么是条件黑名单？</h3>
				<p>
					26分享会的旗舰策略「凌烟阁」是对个股盘中择时的策略，普通的买入黑名单已经无法满足策略的需求。因此我们为其量身定制了“条件黑名单”功能：当策略选中了这只股票，且盘中择时策略信号明确为“买入”时，条件黑名单会进行实时判断，如果触发了设置的条件，系统也会果断拒绝下单！
				</p>
				<p className={`${memberPromoMutedTextClassName} underline underline-offset-2`}>
					（※目前该功能已支持根据涨跌幅设置，后续还将解锁更多维度，敬请期待！）
				</p>
			</section>

			<section className="mt-5 space-y-2">
				<h3 className="font-semibold">三、核心使用场景</h3>
				<ol className="list-decimal space-y-2 pl-5">
					<li>
						<span className="font-medium">涨幅超过：</span>
						当某只股票下单时，当日涨幅超过了设定的阈值则不买入。专治“情绪高潮”和“追涨杀跌”，宁可错过不做错。
						很多时候，日内大幅拉升后往往就是全天最高点，这道防线能帮你有效避免在情绪顶点成为接盘侠。
					</li>
					<li>
						<span className="font-medium">跌幅超过：</span>
						当某只股票下单时，当日跌幅超过了设定的阈值则不买入。专防夜间或盘中突发利空的“黑天鹅”，避开暴跌飞刀。
						当盘中发布暴雷或利空消息时，往往伴随恐慌性抛售，这道防线能帮你瞬间识别异常暴跌。
					</li>
					<li>
						<span className="font-medium">振幅超过：</span>
						当某只股票下单时，当日振幅【(当日目前最高价 - 当日目前最低价) /
						前收盘价 -
						1】超过了设定的阈值则不买入。专避“猴市”震荡与多空剧烈博弈，振幅过大说明多空分歧巨大，在这种不确定性极高的情况下入场，极易被反复打脸。这项条件能帮你有效规避不稳定期的波动风险。
					</li>
				</ol>
			</section>

			<section className="mt-6 space-y-2 text-center">
				<p className="font-semibold">把风险关进笼子，让利润奔跑！</p>
				<p>谁能把风控做好，谁就能在市场里活得更久、走得更远。</p>
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
