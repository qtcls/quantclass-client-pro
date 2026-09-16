/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

const BIG_QMT_TUTORIAL_URL = "https://bbs.quantclass.cn/thread/88365"

export function BigQmtAgreementContent() {
	const { openUrl } = window.electronAPI

	return (
		<div className="space-y-5 text-[13px] leading-7 text-foreground/85">
			<section className="space-y-2">
				<h3 className="text-sm font-semibold text-foreground">
					一、大QMT客户端切换说明
				</h3>
				<p>
					如果 miniQMT 可以正常使用，建议无需切换至大QMT。是否需要切换，请先咨询你的券商客户经理。
				</p>
				<p>
					如确需切换，需要手动完成大QMT客户端配置，具体操作可参考：
					<button
						type="button"
						className="text-primary underline underline-offset-2 hover:opacity-80"
						onClick={() => openUrl(BIG_QMT_TUTORIAL_URL)}
					>
						Mini_QMT迁移至大QMT教程 - 量化小论坛
					</button>
					。
				</p>
			</section>

			<section className="space-y-2">
				<h3 className="text-sm font-semibold text-foreground">
					二、切换大QMT的适用场景
				</h3>
				<p>
					主要用于部分券商不提供或无法使用 miniQMT 的情况，作为兼容方案。
				</p>
			</section>

			<section className="space-y-2">
				<h3 className="text-sm font-semibold text-foreground">三、需要注意</h3>
				<p>
					大QMT的实时行情数据更新速度显著慢于 miniQMT，因此建议仅作为保底实时数据源使用。
				</p>
			</section>
		</div>
	)
}
