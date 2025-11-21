/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { Button } from "@/renderer/components/ui/button"
import { EditIcon } from "@/renderer/icons/EditIcon"
import { SelectStgForm } from "@/renderer/page/strategy/form"
import { SelectStgType } from "@/renderer/types/strategy"

import { parseToTimeValueWithSecond } from "@/renderer/utils"

import { useFusionManager } from "@/renderer/hooks/useFusionManager"
import { useStrategyManager } from "@/renderer/hooks/useStrategyManager"
import { useState } from "react"
import { toast } from "sonner"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"

export default function StrategyEditDialog({
	strategy,
	rowIndex,
	fusionIndex = -1, //如果是分享会的话，会使用不同的更新逻辑
}: {
	strategy: SelectStgType
	rowIndex: number
	fusionIndex?: number
}) {
	const [open, setOpen] = useState(false)
	const [isHovered, setIsHovered] = useState(false)

	const { updateSelectStg } = useStrategyManager()

	const { updateFusionStgInRow } = useFusionManager()

	const handleSave = async (values: any) => {
		// -- 处理选股数量，确保是有效数字
		const selectNum = Number(values.select_num)
		if (Number.isNaN(selectNum) || selectNum <= 0) {
			toast.error("选股数量必须是大于 0 的数字")
			return
		}

		const updatedStg = {
			...strategy,
			...values,
			offset_list: values.offset_list.split(",").map(Number),
			rebalance_time: values.rebalance_time,
		} as SelectStgType

		updateSelectStg(rowIndex, updatedStg)
		console.log("library-row-save", updatedStg)

		toast.success(`🔥 ${strategy.name} 配置成功`)
	}

	/**
	 * 保存Fusion模式下的策略
	 * @param values
	 */
	const handleSavePos = async (values: any) => {
		const newStg = updateFusionStgInRow(fusionIndex, values, strategy, rowIndex)
		console.log("fusion-row-save", newStg)
	}

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className="h-8 w-8"
				onClick={(e) => {
					e.stopPropagation()
					setOpen(true)
				}}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				<EditIcon className="w-4 h-4" forceAnimate={isHovered} />
			</Button>

			<Dialog
				open={open}
				onOpenChange={(value) => {
					setOpen(value)
				}}
			>
				<DialogContent className="max-w-4xl p-0 gap-0">
					<DialogHeader className="p-4">
						<DialogTitle className="flex items-center gap-2">
							<EditIcon className="size-7" />
							<span>编辑{strategy.name}</span>
						</DialogTitle>
					</DialogHeader>
					<div className="border-t">
						<SelectStgForm
							key={strategy.name}
							name={strategy.name}
							submitText="保存设置"
							defaultValues={{
								name: strategy.name,
								hold_period: strategy.hold_period,
								offset_list: (strategy.offset_list ?? ["0"]).join(","),
								filter_list: strategy.filter_list,
								factor_list: strategy.factor_list,
								select_num: strategy.select_num,
								buy_time: strategy.buy_time
									? parseToTimeValueWithSecond(strategy.buy_time)
									: undefined,
								sell_time: strategy.sell_time
									? parseToTimeValueWithSecond(strategy.sell_time)
									: undefined,
								rebalance_time: strategy.rebalance_time ?? "close-open",
								split_order_amount:
									strategy?.split_order_amount ||
									Math.floor(Math.random() * (12000 - 6000 + 1)) + 6000,
								timing: strategy.timing,
							}}
							onSave={async (values) => {
								if (fusionIndex < 0) {
									await handleSave(values)
								} else {
									await handleSavePos(values)
								}
							}}
						/>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
