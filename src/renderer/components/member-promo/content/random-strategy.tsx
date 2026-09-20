/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import randomStrategy1 from "@/renderer/assets/member-promo/random-strategy/1.png"
import randomStrategy2 from "@/renderer/assets/member-promo/random-strategy/2.png"
import randomStrategy3 from "@/renderer/assets/member-promo/random-strategy/3.png"
import {
	FEN_CLASS_LINKS,
	FEN_CLASS_URL_BY_YEAR,
} from "@/renderer/components/member-promo/constants"
import { MemberPromoTabPanel } from "@/renderer/components/member-promo/promo-tab-panel"
import { memberPromoMutedTextClassName } from "@/renderer/components/member-promo/theme"

export function RandomStrategyPromoContent() {
	const { openUrl } = window.electronAPI

	return (
		<MemberPromoTabPanel
			title="精心随机策略库"
			images={[
				{ src: randomStrategy1, caption: "精心随机策略库 - 客户端界面" },
				{ src: randomStrategy2, caption: "精心随机策略库 - 本地文件" },
				{ src: randomStrategy3, caption: "某精心随机策略回测结果" },
			]}
		>
			<section className="space-y-2">
				<h3 className="font-semibold">一、什么是精心随机？</h3>
				<p>
					精心随机是在合理参数平原内，为每一位学员随机组合、随机取参、随机择时，生成的一份专属策略包。它只做两件事：
				</p>
				<ol className="list-decimal space-y-1 pl-5">
					<li>
						<span className="font-medium">上手快：</span>
						下载精心随机包后，简单回测无问题即可投入实盘。
					</li>
					<li>
						<span className="font-medium">不撞车：</span>
						每个人拿到的都是属于自己的独有策略，从源头上避开拥挤。
					</li>
				</ol>
			</section>

			<section className="mt-5 space-y-2">
				<h3 className="font-semibold">二、为什么要精心随机？</h3>
				<p>
					精心随机源自一起不可说的策略拥挤事件。策略上线后，由于策略逻辑扎实、回测表现优异，很多同学直接在默认策略上了大资金，导致策略拥挤，由此产生了精心随机服务。
				</p>
				<p className="font-medium">为什么必须避免拥挤：</p>
				<ol className="list-decimal space-y-2 pl-5">
					<li>
						<span className="font-medium">拥挤会直接吃掉收益：</span>
						当大量资金在同一换仓时点、用同一套信号、对同一批标的做同方向交易时，订单会集中涌向盘口。买的时候大家同时抢着买，卖的时候大家同时抢着卖，盘口深度被迅速吃掉，成交价会一档一档被推高或砸低。实际成交价会明显偏离回测中的理想成交价，冲击成本、滑点成本和机会成本一起上升，策略收益被交易摩擦吃掉。
					</li>
					<li>
						<span className="font-medium">拥挤会被市场看见：</span>
						策略拥挤不只是“自己多付滑点”，还会让交易行为成为市场中的异常信号。集中买入会在短时间内推高价格、放大成交量；集中卖出会在短时间内砸低价格、抽走流动性，造成标的波动异常。其他资金一旦识别出这种规律，就可能提前抢跑、反向埋伏，或者利用固定的换仓窗口进行博弈。对策略来说，还会出现信号失真、容量下降、回撤扩大，从“赚取市场错误定价”变成“被市场反向收割”。
					</li>
				</ol>
			</section>

			<section className="mt-5 space-y-2">
				<h3 className="font-semibold">三、精心随机了什么？</h3>
				<ol className="list-decimal space-y-2 pl-5">
					<li>
						<span className="font-medium">策略随机：</span>
						包含当年分享会的全部策略，由系统随机组合（包括选股策略与旗舰策略的组合），不合适的组合会被剔除。所有因子文件一并提供，你也可以自行修改组合！
					</li>
					<li>
						<span className="font-medium">参数随机：</span>
						分享会交付的策略都经过筛选，参数平原广阔。我们在合理区间内分散取参——不同学员的数值不同，选股结果略有差异，但策略表现仍在同一水平线上。
					</li>
					<li>
						<span className="font-medium">交易随机：</span>
						换仓周期与换仓时间同样在有效范围内随机。系统把全天交易时段按 5
						分钟切分为 50+
						个换仓时点（详见“分享会策略专属功能”），你可能拿到周二
						09:55，别人可能是周四 10:05。
					</li>
				</ol>
			</section>

			<section className="mt-5 space-y-2">
				<h3 className="font-semibold">四、关于它的三点提醒：</h3>
				<ol className="list-decimal space-y-2 pl-5">
					<li>
						<span className="font-medium">
							不要为了“回测最好”反复下载挑选。
						</span>{" "}
						回测好坏不代表未来表现，经验也一再表明，学员自己魔改的策略常常跑不过精心随机——过拟合的风险，远比参数差异更可怕，把命运交给风。
					</li>
					<li>
						<span className="font-medium">它的核心目的是让你“看懂”策略。</span>{" "}
						在实盘运行中观察涨跌规律、offset、rebalance 到底是如何影响结果的。
					</li>
					<li>
						<span className="font-medium">
							你今天观察到的每一个特性，都是你之后调参和理解策略的基础。
						</span>
					</li>
				</ol>
			</section>

			<section className="mt-6 space-y-2 text-center">
				<p className="font-semibold">
					精心随机的前提，是有一套值得被随机的策略。
				</p>
				<p>
					这些策略、因子文件，以及这份为你量身定制的精心随机包，都来自每年的分享会。
				</p>
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
