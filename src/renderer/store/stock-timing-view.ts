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
import { atomWithStorage } from "jotai/utils"

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

export const STOCK_TIMING_CARD_BODY_HEIGHT_DEFAULT = 112
export const STOCK_TIMING_CARD_BODY_HEIGHT_MIN = 72
export const STOCK_TIMING_CARD_BODY_HEIGHT_MAX = 480

// 走马灯模式下策略卡片内容区高度，该模式内各卡片共用
export const stockTimingCarouselCardBodyHeightAtom = atomWithStorage<number>(
	"stock-timing:card-body-height:carousel",
	STOCK_TIMING_CARD_BODY_HEIGHT_DEFAULT,
)

// 列表模式下策略卡片内容区高度，该模式内各卡片共用
export const stockTimingListCardBodyHeightAtom = atomWithStorage<number>(
	"stock-timing:card-body-height:list",
	STOCK_TIMING_CARD_BODY_HEIGHT_DEFAULT,
)

// 走马灯 CarouselItem flex-basis 百分比，默认 40%（等同 basis-2/5）
export const STOCK_TIMING_CAROUSEL_SLIDE_BASIS_DEFAULT = 40
export const STOCK_TIMING_CAROUSEL_SLIDE_BASIS_MIN = 18
export const STOCK_TIMING_CAROUSEL_SLIDE_BASIS_MAX = 92

export const stockTimingCarouselSlideBasisPercentAtom = atomWithStorage<number>(
	"stock-timing:carousel-slide-basis-percent",
	STOCK_TIMING_CAROUSEL_SLIDE_BASIS_DEFAULT,
)
