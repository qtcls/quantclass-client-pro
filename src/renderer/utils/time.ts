/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { pad2 } from "@/shared/lib/trading-day"

/**
 * 把换仓买/卖时点格式化为 HH:mm:ss 展示串（未配置时给占位符）。
 * 唯一来源：策略表单与换仓时间弹窗共用，勿再复制局部副本。
 */
export function formatRebTimeDisplay(
	time: { hour: number; minute: number; second?: number } | undefined,
): string {
	if (!time) return "--:--:--"
	return `${pad2(time.hour)}:${pad2(time.minute)}:${pad2(time.second ?? 0)}`
}
