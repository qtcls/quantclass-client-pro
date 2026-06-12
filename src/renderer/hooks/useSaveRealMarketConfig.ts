/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { realMarketConfigSchemaAtom } from "@/renderer/store/storage"
import {
	type RealMarketConfigUi,
	decodeToUi,
} from "@/shared/lib/real-market-config-codec"
import { useSetAtom } from "jotai"
import { useCallback } from "react"
import { toast } from "sonner"

const { saveRealMarketConfig } = window.electronAPI

/**
 * 实盘配置 `real_market_config` 唯一权威写入 hook（S2a 单源）。
 *
 * 封装三件必须成套发生的事，避免任何写入点漏掉而导致 UI 与 config.json 静默漂移：
 * 1. 经 `save-real-market-config` IPC 落盘（main 侧 encode 冻结编码 + merge 不 clobber + 权威拒绝 rocket 运行中写）；
 * 2. 失败（含 `trading_active`）统一 toast.error，**不更新 atom、不返回成功**（fail-closed）；
 * 3. 成功后用 ack 回传的 merge 结果 `decodeToUi` 回灌 schema atom —— 承载"UI 投影 == config.json"的单源不变量。
 *
 * 成功后的 UI 副作用（成功 toast / 关闭弹窗 / 触发启动链）由调用方按返回值自行决定。
 *
 * @param patch 仅含改动字段的 UI partial（main 侧只 merge 显式传入的 key）。
 * @param activeVerb 失败文案动词（如「保存配置」「修改过滤设置」「修改性能模式」）。
 * @returns 是否成功（ack.ok）。
 */
export function useSaveRealMarketConfig() {
	const setRealMarketConfig = useSetAtom(realMarketConfigSchemaAtom)

	return useCallback(
		async (
			patch: Partial<RealMarketConfigUi>,
			activeVerb: string,
		): Promise<boolean> => {
			const ack = await saveRealMarketConfig(patch)
			if (!ack.ok) {
				toast.error(
					ack.reason === "trading_active"
						? `实盘运行中，无法${activeVerb}，请先暂停实盘`
						: "保存失败",
				)
				return false
			}
			setRealMarketConfig(decodeToUi(ack.config))
			return true
		},
		[setRealMarketConfig],
	)
}
