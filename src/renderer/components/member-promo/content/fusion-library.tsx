/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import fusionLibrary1 from "@/renderer/assets/member-promo/fusion-library/1.png"
import fusionLibrary2 from "@/renderer/assets/member-promo/fusion-library/2.png"
import fusionLibrary3 from "@/renderer/assets/member-promo/fusion-library/3.png"
import fusionLibrary4 from "@/renderer/assets/member-promo/fusion-library/4.png"
import fusionLibrary5 from "@/renderer/assets/member-promo/fusion-library/5.png"
import {
	FEN_CLASS_LINKS,
	FEN_CLASS_URL_BY_YEAR,
} from "@/renderer/components/member-promo/constants"
import { MemberPromoTabPanel } from "@/renderer/components/member-promo/promo-tab-panel"
import { memberPromoMutedTextClassName } from "@/renderer/components/member-promo/theme"

function FenClassYearLink({ year }: { year: 2024 | 2025 | 2026 }) {
	const { openUrl } = window.electronAPI
	const link = FEN_CLASS_LINKS.find((item) => item.year === year)
	if (!link) return null

	return (
		<div className="mt-3 space-y-2 text-center">
			<p className={memberPromoMutedTextClassName}>
				[ 了解{year}期策略分享会 ↓↓↓ ]
			</p>
			<button
				type="button"
				className="rounded-md border border-[#3D4C82] px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
				style={{ backgroundColor: link.bg }}
				onClick={() => openUrl(FEN_CLASS_URL_BY_YEAR[year])}
			>
				{link.label}
			</button>
		</div>
	)
}

export function FusionLibraryPromoContent() {
	return (
		<MemberPromoTabPanel
			title="分享会专属策略库"
			images={[
				{ src: fusionLibrary1, caption: "分享会专属策略库" },
				{ src: fusionLibrary2, caption: "分享会专属策略库 — 旗舰策略混合" },
				{ src: fusionLibrary3, caption: "2024期策略分享会旗舰策略 — 风火轮" },
				{
					src: fusionLibrary4,
					caption: "2025期策略分享会旗舰策略 — 定风波 + 选股策略随机混合",
				},
				{
					src: fusionLibrary5,
					caption: "选股策略精心随机 + 2026期策略分享会旗舰策略 — 凌烟阁",
				},
			]}
		>
			<section className="space-y-2">
				<h3 className="font-semibold">什么是分享会专属策略库？</h3>
				<p>
					对于一些参与分享会2年及以上的资深同学来说，手里积累的策略越来越多，如何高效的管理和实盘多年分享会旗舰策略成为了新的痛点，策略库就是为此量身打造的“终极指挥中心”。
				</p>
				<p>
					在这里，你无需为多个策略、资金分配、参数修改而烦恼。无论是资金权重的灵活配比，还是持仓周期、换仓时间的不同模式，风火轮的锐利、定风波的稳健、凌烟阁的智能，都可以在这一个界面内统筹管理。你所需要做的就是点点鼠标指挥，剩下的交给时间和策略！
				</p>
			</section>

			<section className="mt-5 space-y-2">
				<h3 className="font-semibold">风火轮策略：</h3>
				<p>
					「风火轮」是24分享会的旗舰策略，基于指数轮动原理，完美融合了“策略即指数”的思想。
				</p>
				<p>
					经过全年「风火轮1」→「风火轮2」→「风火轮3」的迭代升级，已经进化为一个进可攻、退可守的超强策略。顺势而为，捕捉市场最强脉搏。它不仅是策略，更是你穿越牛熊的底气。
				</p>
				<p>
					「风火轮3」在25、26年样本外战绩斐然，25年市场表现好的情况下能及时跟上行情；26年5月引入白马抱团策略进一步升级后，在科技抱团时精准切换，抱团瓦解时及时撤离。自24年8月策略介绍后至26年8月，两年时间轻松
					<span className="font-bold text-danger">翻倍</span>。
				</p>
				<FenClassYearLink year={2024} />
			</section>

			<section className="mt-5 space-y-2">
				<h3 className="font-semibold">选股精心随机混合：</h3>
				<p>
					选股精心随机混合是25分享会推出的重磅之作，完美诠释了“不要把所有鸡蛋放在一个篮子里”的智慧。采用不同策略类型混合实现风格覆盖，策略间此消彼长、各领风骚，大大降低了单一策略的大幅回撤风险。
				</p>
				<p>
					在此基础上，每个选股策略还可以配置不同的「定风波」择时，进一步降低策略回撤。「定风波」择时是25分享会的旗舰策略，可以对选股策略进行再择时，自动判定开仓/离场并执行。
				</p>
				<p>
					经过全年「定风波1」→「定风波1p5」→「定风波2」→「定风波3」的迭代升级，拥有超强的回撤控制效果，能把小市值类策略回撤控制在
					<span className="font-bold text-danger">15%</span>
					左右。让你的策略稳步增长，远离回撤后那失眠的漫漫长夜，一觉醒来又是稳步新高~
				</p>
				<FenClassYearLink year={2025} />
			</section>

			<section className="mt-5 space-y-2">
				<h3 className="font-semibold">选股策略精心随机：</h3>
				<p>
					选股策略精心随机是26分享会专为旗舰策略「凌烟阁」定制的精心随机策略。精妙地区分了策略类型（如：小市值类、中市值类、大市值类），独立配置适合的个股择时方案。实操时还能再结合策略类型混合理念。
				</p>
				<p>
					「凌烟阁」是26分享会的旗舰策略，可以对策略内个股进行择时，展现超强统治力！能根据市场行情匹配合适的择时策略，无论市场走到哪个周期、哪个阶段，都有对应的策略帮你自动判断进、出场时机并自动执行。
					<span className="font-bold text-danger">任何策略</span>
					、甚至
					<span className="font-bold text-danger">主观</span>
					选择的个股也能适配。
				</p>
				<p>
					目前经过「凌烟阁1」→「凌烟阁1.2」→「凌烟阁2」的迭代升级，拥有丰富的策略库，可以覆盖各种风格。别看迭代版本相对风火轮、定风波较少，实则开发广度和深度巨大，参数平原极度宽广，底层逻辑坚如磐石，超额长期显著。全天候自动运行，省心省力，再也不用天天盯盘！
				</p>
				<FenClassYearLink year={2026} />
			</section>
		</MemberPromoTabPanel>
	)
}
