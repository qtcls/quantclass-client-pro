/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import configMaster1 from "@/renderer/assets/member-promo/config-master/1.png"
import configMaster2 from "@/renderer/assets/member-promo/config-master/2.png"
import configMaster3 from "@/renderer/assets/member-promo/config-master/3.png"
import configMaster4 from "@/renderer/assets/member-promo/config-master/4.png"
import configMaster5 from "@/renderer/assets/member-promo/config-master/5.png"
import configMaster6 from "@/renderer/assets/member-promo/config-master/6.png"
import { FEN_CLASS_LINKS, FEN_CLASS_URL_BY_YEAR } from "@/renderer/components/member-promo/constants"
import { MemberPromoTabPanel } from "@/renderer/components/member-promo/promo-tab-panel"
import { memberPromoMutedTextClassName } from "@/renderer/components/member-promo/theme"

export function ConfigMasterPromoContent() {
	const { openUrl } = window.electronAPI

	return (
		<MemberPromoTabPanel
			title="Config大师"
			images={[
				{ src: configMaster1, caption: "Config大师 － 首页" },
				{ src: configMaster2, caption: "Config大师 － 策略基础配置" },
				{ src: configMaster3, caption: "Config大师 － 因子配置" },
				{ src: configMaster4, caption: "Config大师 － 高级功能配置" },
				{ src: configMaster5, caption: "Config大师 － 运行配置" },
				{ src: configMaster6, caption: "Config大师 － 一键导出实盘" },
			]}
		>
			<section className="space-y-2">
				<h3 className="font-semibold">一、什么是Config大师？</h3>
				<p>
					量化交易员最理想的状态就是能把核心精力投入在策略研究和优化上，但现实往往是大量宝贵的时间被消耗在繁琐的代码修改中。Config大师就是为此专门开发的一站式可视化神器，不用会代码，甚至都不需要装python，打开图形界面，点点鼠标就能像搭积木一样轻松配置策略，还能集中管理、一键导出。
				</p>
			</section>

			<section className="mt-5 space-y-2">
				<h3 className="font-semibold">二、解决了什么痛点？</h3>
				<p>
					过去，策略改个参数要翻半天代码，混合策略的代码一眼看过去眼花缭乱，改完之后因子条件、排序方式、换仓时间还要反复核对，一整套流程下来累的不行。好不容易改好了还有可能报错，排查半天结果发现是没加“,”，这样太浪费时间了。
				</p>
				<p>
					现在，这些都可以在Config大师的图形化界面上完成，所有配置一目了然，所有策略统一管理，还不用担心代码报错，分分钟构建一个完整策略。
				</p>
			</section>

			<section className="mt-5 space-y-2">
				<h3 className="font-semibold">三、Config大师能配什么？</h3>
				<p>只要是和策略相关的都能在这里一键配置：</p>
				<ol className="list-decimal space-y-2 pl-5">
					<li>
						<span className="font-medium">策略基础配置：</span>
						策略名称、资金权重、持仓周期（如3D、5D）、
						<code>offset_list</code>
						（如2,4）、选股数量、换仓时间（如0955-0955）。原本需要反复核对的复杂参数，现在只需在下拉框和输入框中轻松点击，配置清晰直观。
					</li>
					<li>
						<span className="font-medium">因子配置：</span>
						无论是截面因子还是前置过滤、后置过滤因子，都可以直接添加、删除、修改参数和使用条件（如{" "}
						<code>pct:&gt;=0.05</code>、<code>val:==0</code>
						）以及排序方式（升序/降序），一目了然，告别在代码里大海捞针。
					</li>
					<li>
						<span className="font-medium">高级混合与择时配置：</span>
						Config大师支持多策略混合配置，并完美接入个股择时和分域配置。可直接选择具体的择时策略（如：定风波1.5、凌烟阁2），并对具体指标参数进行图形化设置，高级玩法也能轻松驾驭。
					</li>
					<li>
						<span className="font-medium">运行配置与数据管理：</span>
						存放路径、时间配置（回测起始时间）、交易配置（初始资金、手续费、滑点）、性能模式等，这些也通通可以在图形界面中集中管理和设置，高效完成策略运行前的所有准备工作。
					</li>
					<li>
						<span className="font-medium">一键导出，直通实盘：</span>
						开发策略只是第一步，Config大师还为你打通了从研发到实盘的“最后一公里”。配置完成后，点击右上角“导出”，即可一键将配置文件导出至客户端进行实盘，无缝衔接！
					</li>
				</ol>
			</section>

			<section className="mt-6 space-y-2 text-center">
				<p className="font-semibold">
					把时间留给策略研究，把繁琐交给 Config 大师。
				</p>
				<p>
					一个不用懂代码，不用记参数，不用切文件，所有配置集中一屏的分享会专属工具。
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
