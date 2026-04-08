/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { StockTimingViewMatrix } from "@/shared/types/stock-timing-view"
import dayjs from "dayjs"
import { atom } from "jotai"
import { atomWithQuery } from "jotai-tanstack-query"

const { getStockTimingView } = window.electronAPI

function getTodayDate() {
	return dayjs(new Date(new Date().getTime() + 8.5 * 60 * 60 * 1000)).format(
		"YYYY-MM-DD",
	)
}

// 日期选择
export const stockTimingDateModeAtom = atom<"today" | "yesterday">("today")

// 个股择时数据
export const stockTimingViewAtom = atomWithQuery<StockTimingViewMatrix>(
	(get) => {
		const mode = get(stockTimingDateModeAtom)
		const today = getTodayDate()
		const date =
			mode === "today"
				? today
				: dayjs(today).subtract(1, "day").format("YYYY-MM-DD")

		return {
			queryKey: ["stock-timing-view", date],
			queryFn: async () => {
				const result = await getStockTimingView(date)
				if (result.status === "success") {
					return result.data || []
				}
				throw new Error(result.message || "获取个股择时数据失败")
			},
			refetchInterval: 60000,
			refetchOnMount: "always",
		}
	},
)

// 是否为走马灯模式
export const stockTimingCarouselModeAtom = atom<boolean>(true)

// 哪些卡片处于展开状态
export const stockTimingCardExpandedSetAtom = atom<Set<number>>(
	new Set<number>(),
)
