/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 *
 * 基于「已排序、去重、YYYY-MM-DD」交易日字符串数组的通用计算（不读文件）。
 * 数据通常来自 period_offset.csv 第一列「交易日期」。
 */

function pad2(n: number): string {
	return String(n).padStart(2, "0")
}

// -- 将 period_offset / 常见导出的日期字符串规范为 YYYY-MM-DD
export function normalizeTradingDateToYmd(raw: string): string | null {
	const s = raw.trim().replace(/^\uFEFF/, "")
	if (!s) {
		return null
	}

	const m1 = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/.exec(s)
	if (m1) {
		const y = Number(m1[1])
		const mo = Number(m1[2])
		const d = Number(m1[3])
		if (mo < 1 || mo > 12 || d < 1 || d > 31) {
			return null
		}
		return `${y}-${pad2(mo)}-${pad2(d)}`
	}

	return null
}

// -- 去重并按日历顺序排序（字符串序即可用于 YYYY-MM-DD）
export function sortUniqueTradingDaysYmd(ymdList: string[]): string[] {
	return [...new Set(ymdList)].sort((a, b) => a.localeCompare(b))
}

// -- 本地日历日对应的 YYYY-MM-DD（不含时区换算，仅年月日）
export function getLocalCalendarYmd(from: Date): string {
	return `${from.getFullYear()}-${pad2(from.getMonth() + 1)}-${pad2(from.getDate())}`
}

// -- 在已排序的交易日列表中，找到最后一个 <= ymd 的下标；若无则 -1
export function findLastTradingDayIndexOnOrBefore(
	sortedYmd: string[],
	ymd: string,
): number {
	let lo = 0
	let hi = sortedYmd.length - 1
	let ans = -1
	while (lo <= hi) {
		const mid = (lo + hi) >> 1
		if (sortedYmd[mid] <= ymd) {
			ans = mid
			lo = mid + 1
		} else {
			hi = mid - 1
		}
	}
	return ans
}

// -- `ymd` 是否出现在已排序交易日列表中（即该日历日在 CSV 中记为交易日）
export function isLocalYmdTradingDayInCalendar(
	sortedUniqueYmd: string[],
	ymd: string,
): boolean {
	const i = findLastTradingDayIndexOnOrBefore(sortedUniqueYmd, ymd)
	return i >= 0 && sortedUniqueYmd[i] === ymd
}

// -- 在已排序的交易日列表中，找到第一个 > ymd 的下标；若无则 -1
export function findFirstTradingDayIndexAfter(
	sortedYmd: string[],
	ymd: string,
): number {
	let lo = 0
	let hi = sortedYmd.length - 1
	let ans = sortedYmd.length
	while (lo <= hi) {
		const mid = (lo + hi) >> 1
		if (sortedYmd[mid] > ymd) {
			ans = mid
			hi = mid - 1
		} else {
			lo = mid + 1
		}
	}
	return ans < sortedYmd.length ? ans : -1
}

/**
 * 以本地「今天」所在日历日为锚：取最后一个不晚于该日的交易日，再往前数 n 个交易日，
 * 返回那一交易日的本地当天 0 点 `Date`。日历不足 n 个交易日时返回 null。
 *
 * @param sortedUniqueYmd 升序、去重、YYYY-MM-DD
 * @param tradingDaysBack 往回数的交易日个数（不含锚定当日）
 */
export function getLocalMidnightOfNthTradingDayBefore(
	sortedUniqueYmd: string[],
	tradingDaysBack: number,
	from: Date = new Date(),
): Date | null {
	if (tradingDaysBack < 1 || sortedUniqueYmd.length === 0) {
		return null
	}
	const anchorYmd = getLocalCalendarYmd(from)
	const refIdx = findLastTradingDayIndexOnOrBefore(sortedUniqueYmd, anchorYmd)
	if (refIdx < 0) {
		return null
	}
	const targetIdx = refIdx - tradingDaysBack
	if (targetIdx < 0) {
		return null
	}
	const ymd = sortedUniqueYmd[targetIdx]
	const parts = ymd.split("-").map(Number)
	const [y, m, d] = parts
	if (
		parts.length !== 3 ||
		Number.isNaN(y) ||
		Number.isNaN(m) ||
		Number.isNaN(d)
	) {
		return null
	}
	return new Date(y, m - 1, d, 0, 0, 0, 0)
}

export function getLocalDateYYYYMMDD(): string {
	const d = new Date()
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
