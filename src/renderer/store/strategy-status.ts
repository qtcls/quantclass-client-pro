/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { StrategyStatus } from "@/shared/types/strategy-status"
import dayjs from "dayjs"
import { atom } from "jotai"
import { atomWithQuery } from "jotai-tanstack-query"

const { getStrategyStatus } = window.electronAPI

/**
 * 选择的日期 Atom
 */
export const selectedDateAtom = atom<string | undefined>()

/**
 * 策略状态列表 Atom
 */
export const strategyStatusAtom = atomWithQuery<StrategyStatus[][]>((get) => {
	const selectedDate = get(selectedDateAtom)

	const date =
		selectedDate ||
		dayjs(new Date(new Date().getTime() + 9 * 60 * 60 * 1000)).format(
			"YYYY-MM-DD",
		)

	return {
		queryKey: ["strategy-status", date],
		queryFn: async () => {
			const result = await getStrategyStatus(date)
			if (result.status === "success") {
				return result.data || []
			}
			throw new Error(result.message || "获取策略状态失败")
		},
		refetchInterval: 60000, // 每分钟刷新一次
		refetchOnMount: "always",
	}
})
