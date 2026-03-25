/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import {
	isMinDataUpdatingAtom,
	minDataAutoAccurateAtom,
	minDataAutoFuzzyAtom,
	minDataModeAtom,
} from "@/renderer/store"
import { realMarketConfigSchemaAtom } from "@/renderer/store/storage"
import { useAtomValue, useSetAtom } from "jotai"
import { useCallback, useMemo } from "react"
import { toast } from "sonner"

const { toggleMinDataSchedule } = window.electronAPI

export function useMinDataSchedule() {
	const mode = useAtomValue(minDataModeAtom)
	const autoAccurate = useAtomValue(minDataAutoAccurateAtom)
	const autoFuzzy = useAtomValue(minDataAutoFuzzyAtom)
	const realMarketConfig = useAtomValue(realMarketConfigSchemaAtom)
	const setIsMinDataUpdating = useSetAtom(isMinDataUpdatingAtom)

	const isQmtConfigured = useMemo(
		() =>
			!!realMarketConfig?.account_id?.trim() &&
			!!realMarketConfig?.qmt_path?.trim(),
		[realMarketConfig?.account_id, realMarketConfig?.qmt_path],
	)

	const startMinDataSchedule = useCallback(
		async (showToast = true) => {
			if (!autoAccurate && !autoFuzzy) {
				toast.warning("请至少选择一种要自动更新的数据类型")
				return false
			}
			if (!isQmtConfigured) {
				toast.warning("QMT 未配置，请先在实盘配置中填写 QMT 账户号和安装路径")
				return false
			}

			await toggleMinDataSchedule({
				isOn: true,
				mode,
				autoAccurate,
				autoFuzzy,
			})
			setIsMinDataUpdating(true)
			if (showToast) {
				toast.dismiss()
				toast.success("自动更新数据已启动")
			}
			return true
		},
		[autoAccurate, autoFuzzy, isQmtConfigured, mode, setIsMinDataUpdating],
	)

	const stopMinDataSchedule = useCallback(async () => {
		await toggleMinDataSchedule({ isOn: false })
		setIsMinDataUpdating(false)
		toast.dismiss()
		toast.info("自动更新数据已停止")
	}, [setIsMinDataUpdating])

	const syncMinDataSchedule = useCallback(
		async (
			overrides?: Partial<{
				mode: "fast" | "stable"
				autoAccurate: boolean
				autoFuzzy: boolean
			}>,
		) => {
			await toggleMinDataSchedule({
				isOn: true,
				mode: overrides?.mode ?? mode,
				autoAccurate: overrides?.autoAccurate ?? autoAccurate,
				autoFuzzy: overrides?.autoFuzzy ?? autoFuzzy,
			})
		},
		[autoAccurate, autoFuzzy, mode],
	)

	return {
		startMinDataSchedule,
		stopMinDataSchedule,
		syncMinDataSchedule,
	}
}
