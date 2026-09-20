/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export const FEN_CLASS_URL = "https://www.quantclass.cn/fen/class/fen-2026"

export const FEN_CLASS_URL_BY_YEAR = {
	2024: "https://www.quantclass.cn/fen/class/fen-2024",
	2025: "https://www.quantclass.cn/fen/class/fen-2025",
	2026: "https://www.quantclass.cn/fen/class/fen-2026",
} as const

export const FEN_CLASS_LINKS = [
	{ year: 2024, label: "2024期策略分享会", bg: "#8C6C91" },
	{ year: 2025, label: "2025期策略分享会", bg: "#EF8152" },
	{ year: 2026, label: "2026期策略分享会", bg: "#BD9783" },
] as const satisfies ReadonlyArray<{
	year: keyof typeof FEN_CLASS_URL_BY_YEAR
	label: string
	bg: string
}>
