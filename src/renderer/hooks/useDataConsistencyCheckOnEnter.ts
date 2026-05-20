/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { runDataConsistencyCheck } from "@/renderer/components/StartupCheckLauncher"
import { type RefObject, useEffect } from "react"
import { toast } from "sonner"

// -- 进入历史数据页时执行数据一致性自检
export function useDataConsistencyCheckOnEnter(
	refreshRecycleBinCountRef?: RefObject<(() => void) | null>,
) {
	useEffect(() => {
		let cancelled = false

		void (async () => {
			const result = await runDataConsistencyCheck()
			if (cancelled) return

			refreshRecycleBinCountRef?.current?.()

			if (!result.ok) {
				toast.error(result.detail ?? "数据一致性检查失败")
				return
			}
			if (result.warning && result.detail) {
				toast.warning(result.detail, { duration: 8000 })
			}
		})()

		return () => {
			cancelled = true
		}
	}, [refreshRecycleBinCountRef])
}
