/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import BuyBlacklist from "@/renderer/page/trading/buy-blacklist"
import TradingControl from "@/renderer/page/trading/control"
import TradingPlan from "@/renderer/page/trading/plan"

export default function TradingPage() {
	return (
		<>
			<div className="h-full flex-1 flex-col md:flex pt-3">
				<TradingControl />
				<hr className="my-4" />
				<div id="buy-black-list">
					<BuyBlacklist titleSize="medium" />
				</div>
				<hr className="my-4" />
				<div id="trading-plan">
					<TradingPlan />
				</div>
			</div>
		</>
	)
}
