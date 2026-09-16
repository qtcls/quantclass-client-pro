/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { fusionAtom, selectStgListAtom } from "@/renderer/store/storage"
import { useAtom } from "jotai"
import { Info } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "./ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog"

const { rendererLog } = window.electronAPI

// 迁移 cap_weight 从旧版百分比格式到新版小数格式，同层级任意 cap_weight > 1 则该层全部除以 100
function migrateCapWeights(
	strategies: Array<Record<string, unknown>>,
	parentName = "",
): {
	data: Array<Record<string, unknown>>
	changed: boolean
	logs: string[]
} {
	if (!Array.isArray(strategies) || strategies.length === 0) {
		return { data: strategies, changed: false, logs: [] }
	}

	const logs: string[] = []
	const isOldFormat = strategies.some(
		(s) => typeof s.cap_weight === "number" && s.cap_weight > 1,
	)
	let changed = isOldFormat

	const migrated = strategies.map((s) => {
		const newS = { ...s }
		const name = (s.name as string) ?? "未命名"
		const fullName = parentName ? `${parentName} > ${name}` : name

		if (isOldFormat && typeof s.cap_weight === "number") {
			newS.cap_weight = s.cap_weight / 100
			logs.push(`${fullName} cap_weight: ${s.cap_weight} -> ${newS.cap_weight}`)
		}

		if (Array.isArray(s.strategy_list)) {
			const sub = migrateCapWeights(
				s.strategy_list as Array<Record<string, unknown>>,
				fullName,
			)
			if (sub.changed) {
				newS.strategy_list = sub.data
				changed = true
			}
			logs.push(...sub.logs)
		}
		if (Array.isArray(s.strategy_pool)) {
			const sub = migrateCapWeights(
				s.strategy_pool as Array<Record<string, unknown>>,
				fullName,
			)
			if (sub.changed) {
				newS.strategy_pool = sub.data
				changed = true
			}
			logs.push(...sub.logs)
		}
		return newS
	})

	return { data: migrated, changed, logs }
}

export function CapWeightMigrateHandler() {
	const [selectStockStg, setSelectStockStg] = useAtom(selectStgListAtom)
	const [fusion, setFusion] = useAtom(fusionAtom)
	const [showDialog, setShowDialog] = useState(false)

	// biome-ignore lint/correctness/useExhaustiveDependencies: 仅挂载时检测一次
	useEffect(() => {
		const selectResult = migrateCapWeights(selectStockStg)
		const fusionResult = migrateCapWeights(fusion)

		if (!selectResult.changed && !fusionResult.changed) return

		const allLogs = [
			...selectResult.logs.map((l) => `[选股策略] ${l}`),
			...fusionResult.logs.map((l) => `[仓管策略] ${l}`),
		]

		rendererLog(
			"info",
			`[cap_weight迁移] 检测到旧版百分比格式，已自动迁移为小数格式：\n${allLogs.join("\n")}`,
		)

		if (selectResult.changed) {
			setSelectStockStg(selectResult.data as typeof selectStockStg)
		}
		if (fusionResult.changed) {
			setFusion(fusionResult.data as typeof fusion)
		}

		setShowDialog(true)
	}, [])

	return (
		<Dialog open={showDialog} onOpenChange={setShowDialog}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Info className="h-5 w-5 text-blue-500" />
						策略权重已自动更新
					</DialogTitle>
					<DialogDescription className="pt-2">
						版本升级后，策略资金占比格式已自动调整。请前往策略库确认各策略的权重配置是否正常。
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button onClick={() => setShowDialog(false)}>我知道了</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
