/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { ReTimingDisplay } from "@/renderer/components/ReTimingDisplay"
import { useBacktestDialog } from "@/renderer/components/backtest-dialog"
import { Button } from "@/renderer/components/ui/button"
import { Input } from "@/renderer/components/ui/input"
import { H2 } from "@/renderer/components/ui/typography"
import { TRADING_SECTION_ROUTE } from "@/renderer/constant"
import { useToggleAutoRealTrading } from "@/renderer/hooks"
import { useStrategyManager } from "@/renderer/hooks/useStrategyManager"
import { RatioIntro } from "@/renderer/page/FAQ/ratioIntro"
import { StrategyCard } from "@/renderer/page/library/basic/strategy-card"
import StgImportButton, {
	type StgImportHandle,
} from "@/renderer/page/library/import-btn"
import { backtestConfigAtom, reTimingAtom } from "@/renderer/store/storage"
import type { SelectStgType } from "@/renderer/types/strategy"
import { BASIC_SELECT_STRATEGY_IMPORT_LIMIT } from "@/shared/lib/basic-strategy-import"
import { useUnmount } from "etc-hooks"
import { useAtom, useAtomValue } from "jotai"
import {
	AlignVerticalSpaceAround,
	Edit,
	PencilRuler,
	Plus,
	TvMinimalPlay,
} from "lucide-react"
import { useRef, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

function AddStrategyCard({
	onClick,
	disabled,
}: {
	onClick: () => void
	disabled?: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/40 text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-accent/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-card/40 disabled:hover:text-muted-foreground"
		>
			<Plus className="size-8" strokeWidth={1.75} />
			<span className="text-sm font-medium">添加策略</span>
		</button>
	)
}

export default function BasicStrategyLibrary() {
	const { setStoreValue } = window.electronAPI
	const [isEditing, setIsEditing] = useState(false)
	const [backtestConfig, setBacktestConfig] = useAtom(backtestConfigAtom)
	const { selectStgList, updateSelectStgList } = useStrategyManager()
	const { isAutoRocket } = useToggleAutoRealTrading()
	const { openBacktest } = useBacktestDialog()
	const reTiming = useAtomValue(reTimingAtom)
	const navigate = useNavigate()
	const importRef = useRef<StgImportHandle>(null)
	const backtestName = backtestConfig.backtest_name
	const canAddMore = selectStgList.length < BASIC_SELECT_STRATEGY_IMPORT_LIMIT

	useUnmount(() => {
		setStoreValue("select_stock.backtest_name", backtestConfig.backtest_name)
	})

	return (
		<div className="h-full flex-1 flex-col space-y-4 md:flex pt-3">
			<div className="w-full">
				<div className="flex items-center gap-2 w-auto">
					{isEditing ? (
						<Input
							autoFocus
							value={backtestName}
							onChange={(e) =>
								setBacktestConfig((p) => ({
									...p,
									backtest_name: e.target.value,
								}))
							}
							className="text-2xl font-semibold tracking-tight h-10 w-auto"
							onBlur={() => setIsEditing(false)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									setIsEditing(false)
								}
							}}
						/>
					) : (
						<>
							<H2>{backtestName}</H2>
							<Button
								size="icon"
								variant="ghost"
								className="h-8 w-8"
								onClick={() => setIsEditing(true)}
							>
								<Edit />
							</Button>
						</>
					)}
				</div>
				<p className="text-muted-foreground">
					导入、查看、编辑各类策略。并设置策略的实盘资金占比
					<span className="text-warning">
						（基础身份最多导入 {BASIC_SELECT_STRATEGY_IMPORT_LIMIT} 个策略）
					</span>
				</p>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<StgImportButton ref={importRef} />
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
				{selectStgList.map((strategy, index) => (
					<StrategyCard
						key={`${strategy.name ?? "stg"}-${index}`}
						strategy={strategy}
						index={index}
					/>
				))}
				{canAddMore && (
					<AddStrategyCard
						disabled={isAutoRocket}
						onClick={() => importRef.current?.openImport()}
					/>
				)}
			</div>

			<ReTimingDisplay reTiming={reTiming} />
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
							(1 / selectStgList.length).toFixed(7),
						)
						const strategies = selectStgList.map((s: SelectStgType) => ({
							...s,
							cap_weight: avgCapWeight,
						}))

						updateSelectStgList(strategies)

						toast.success(`平均分配权重，每个策略为${avgCapWeight * 100}%`)
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
						onClick={openBacktest}
					>
						<PencilRuler className="size-4 mr-2" />
						前往回测
					</Button>

					<Button
						size="sm"
						variant="outline"
						className="h-8 lg:flex"
						onClick={() =>
							navigate(`${TRADING_SECTION_ROUTE}?tab=real_trading`)
						}
					>
						<TvMinimalPlay className="size-4 mr-2" />
						前往实盘
					</Button>
				</div>
			</div>
			<hr />
			<RatioIntro />
		</div>
	)
}
