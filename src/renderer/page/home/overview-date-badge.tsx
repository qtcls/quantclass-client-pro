/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { cn } from "@/renderer/lib/utils"
import { useTradingSession } from "@/renderer/hooks/useTradingSession"

export function OverviewDateBadge() {
	const session = useTradingSession()

	return (
		<span
			className={cn(
				"text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full",
				session.badgeClassName,
			)}
		>
			{session.badgeText}
		</span>
	)
}
