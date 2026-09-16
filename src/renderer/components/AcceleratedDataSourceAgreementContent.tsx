/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export function AcceleratedDataSourceAgreementContent() {
	return (
		<div className="space-y-5 text-[13px] leading-7 text-foreground/85">
			<section className="space-y-2">
				<h3 className="text-sm font-semibold text-foreground">一、服务说明</h3>
				<p>
					为缓解部分用户在使用 QMT 本地数据时，因网络波动、接口响应慢、电脑硬盘读写性能、QMT
					本地缓存或盘中更新不稳定等原因导致的数据拉取延迟，我们额外建设了加速数据源服务。
				</p>
				<p>
					加速数据源并非简单替代 QMT
					本地数据，而是在原有 QMT
					数据获取能力之外，额外提供的分钟级数据加速通道。为提升数据获取速度与可用性，我们接入了多个加速通道，并承担了相应的数据分发、带宽、服务器和维护成本，尽可能为用户提供更稳定、更快速的数据获取体验。
				</p>
			</section>

			<section className="space-y-2">
				<h3 className="text-sm font-semibold text-foreground">
					二、数据获取路径
				</h3>
				<p>启用后，系统获取分钟级数据的路径如下：</p>
				<ol className="list-decimal space-y-2 pl-5">
					<li>系统将优先使用加速通道 1 获取分钟级数据。</li>
					<li>
						若加速通道 1
						遇到数据更新故障、分发故障、网络故障或其他不可用情况，系统将自动切换至加速通道
						2。
					</li>
					<li>
						若加速通道 2
						仍不可用，系统会继续按顺序尝试后续加速通道，以尽可能降低单一数据源、单一运营商、单一城市节点带来的故障影响。
					</li>
					<li>
						若所有加速通道均暂时不可用，系统仍会回退至本地 QMT
						数据源，用于继续更新盘中数据，尽量保证数据更新流程不中断。
					</li>
				</ol>
			</section>

			<section className="space-y-2">
				<h3 className="text-sm font-semibold text-foreground">
					三、数据差异说明
				</h3>
				<ol className="list-decimal space-y-2 pl-5">
					<li>
						不同数据源在行情聚合、数据补齐、异常修正、发布时间和统计口径上可能存在差异，因此加速数据源与
						QMT 本地数据之间可能出现数值不完全一致的情况。
					</li>
					<li>
						通常情况下，价格类数据差异相对较小；成交量、成交额等统计类数据由于聚合口径不同，可能更容易出现一定偏差。
					</li>
					<li>
						多数据源之间存在差异属于已知情况，我们无法直接干预各数据源的生成规则、修正规则和发布规则。同时，QMT
						本地获取的数据也可能受到网络、缓存、接口状态、补数据机制等因素影响，并不代表在所有情况下均绝对准确。
					</li>
					<li>
						加速数据源主要用于提升分钟级数据获取速度，缓解 QMT
						本地拉取慢、盘中更新波动或本地环境异常带来的影响。若涉及最终核对、重要交易决策、异常数据排查或结果复盘，建议结合
						QMT 本地数据及其他可靠数据源进行交叉验证。
					</li>
				</ol>
			</section>

			<section className="space-y-2">
				<h3 className="text-sm font-semibold text-foreground">
					四、确认与免责声明
				</h3>
				<p>
					请确认您已充分理解：加速数据源是我们为提升数据获取速度和可用性而额外提供的增强服务；启用后系统将优先使用加速通道，并在通道异常时自动切换至其他通道，必要时回退至本地
					QMT 数据源；不同数据源之间可能存在数据差异，且任何数据源均无法保证 100%
					可用或完全一致。
				</p>
				<p className="font-medium text-foreground">
					我已理解加速数据源将优先用于分钟级数据获取，并会在通道异常时自动切换或回退至本地
					QMT；同时我已知悉不同数据源可能存在数据差异，确认启用。
				</p>
			</section>
		</div>
	)
}
