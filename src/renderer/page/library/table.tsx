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
import { DataTable } from "@/renderer/components/ui/data-table"
import { DataTableToolbar } from "@/renderer/components/ui/data-table-toolbar"
import { BACKTEST_PAGE, REAL_MARKET_CONFIG_PAGE } from "@/renderer/constant"
import { useToggleAutoRealTrading } from "@/renderer/hooks"
import { useStrategyManager } from "@/renderer/hooks/useStrategyManager"
import StgImportButton from "@/renderer/page/library/import-btn"

import { useGenLibraryColumn } from "@/renderer/hooks/useGenLibraryCol"
import type { SelectStgType } from "@/renderer/types/strategy"
import {
	AlignVerticalSpaceAround,
	PencilRuler,
	TvMinimalPlay,
} from "lucide-react"
import { forwardRef } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

export const LibraryTable = forwardRef((_, _ref) => {
	const { selectStgList, updateSelectStgList } = useStrategyManager()
	const { isAutoRocket } = useToggleAutoRealTrading()
	const navigate = useNavigate()

	const columns = useGenLibraryColumn(() => {})

	return (
		<>
			<DataTable
				data={selectStgList}
				loading={false}
				columns={columns}
				pagination={false}
				placeholder="查找所有列..."
				actionOptions={(props) => (
					<DataTableToolbar {...props} enableSearch={false}>
						<StgImportButton />
					</DataTableToolbar>
				)}
			/>
			<div className="flex items-center justify-between gap-2">
				<Button
					size="sm"
					className="h-8 lg:flex"
					disabled={isAutoRocket || selectStgList.length === 0}
					onClick={() => {
						if (selectStgList.length === 0) {
							toast.warning("请先导入策略")
							return
						}
						const avgCapWeight = Number.parseFloat(
							(100 / selectStgList.length).toFixed(6),
						)
						const strategies = selectStgList.map((s: SelectStgType) => ({
							...s,
							cap_weight: avgCapWeight,
						}))

						updateSelectStgList(strategies)

						toast.success(`平均分配权重，每个策略为${avgCapWeight}%`)
					}}
				>
					<AlignVerticalSpaceAround className="size-4 mr-2" />
					平均分配权重
				</Button>
				<div className="flex items-center gap-2">
					<Button
						size="sm"
						variant="outline"
						disabled={isAutoRocket}
						className="h-8 lg:flex"
						onClick={() => navigate(BACKTEST_PAGE)}
					>
						<PencilRuler className="size-4 mr-2" />
						前往回测
					</Button>

					<Button
						size="sm"
						variant="outline"
						className="h-8 lg:flex"
						onClick={() => navigate(REAL_MARKET_CONFIG_PAGE)}
					>
						<TvMinimalPlay className="size-4 mr-2" />
						前往实盘
					</Button>
				</div>
			</div>
		</>
	)
})
