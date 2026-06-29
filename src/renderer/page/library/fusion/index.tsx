import {
	FactorListDialog,
	ParamsDialog,
} from "@/renderer/components/FactorParamsDialog"
import { ReTimingDisplay } from "@/renderer/components/ReTimingDisplay"
import RebTimeConfigModal from "@/renderer/components/RebTimeConfigModal"
/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */
import { StrategyNameDisplay } from "@/renderer/components/strategy-name-display"
import { Badge } from "@/renderer/components/ui/badge"
import { Button } from "@/renderer/components/ui/button"
import ButtonTooltip from "@/renderer/components/ui/button-tooltip"
import { DataTable } from "@/renderer/components/ui/data-table"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/renderer/components/ui/popover"
import { Separator } from "@/renderer/components/ui/separator"
import { useFusionManager } from "@/renderer/hooks/useFusionManager"
import { useGenLibraryColumn } from "@/renderer/hooks/useGenLibraryCol"
import { cn } from "@/renderer/lib/utils"
import ImportStrategyButton from "@/renderer/page/library/fusion/import-btn"
import PosStrategyEditDialog from "@/renderer/page/strategy/pos-edit-dialog"
import StrategyReplaceDialog from "@/renderer/page/strategy/replace-dialog"
import type {
	PosStrategyType,
	SelectStgType,
	StgGroupType,
} from "@/renderer/types/strategy"
import { getFusionTopRealMarketStrategyName } from "@/shared/lib/real-market-strategy-name"
import { NumberInput } from "@heroui/number-input"
import { Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { RatioIntro } from "../../FAQ/ratioIntro"

// 独立的策略表格组件
interface StrategyTableProps {
	data: SelectStgType[]
	strategyIndex: number
	showCapWeight: boolean
	/** 为 true 时不渲染操作列（pos 类型下 strategy_pool） */
	hideOperationColumn?: boolean
	/** 仓管 group 名称，用于子策略 real_market 默认标识 */
	parentGroupName?: string
	/** 仓管顶层单策略表格使用 X 前缀默认标识 */
	realMarketFallback?: "fusion-top"
}

const StrategyTable = ({
	data,
	strategyIndex,
	showCapWeight,
	hideOperationColumn = false,
	parentGroupName,
	realMarketFallback,
}: StrategyTableProps) => {
	const columns = useGenLibraryColumn(
		() => {},
		true,
		strategyIndex,
		data,
		hideOperationColumn,
		parentGroupName,
		realMarketFallback,
	)

	let tempCapWeight = 0
	if (data) {
		const allCapWeight = data.reduce((sum, subStrategy) => {
			// 修复：只有当 cap_weight 为 undefined 或 null 时才设置默认值，0 是有效值
			subStrategy.cap_weight = subStrategy.cap_weight ?? 1
			return sum + subStrategy.cap_weight
		}, 0)
		tempCapWeight = Math.round(allCapWeight * 100)
	}

	const tempColumns = columns.map((col: any) => {
		if (col.accessorKey === "cap_weight") {
			return {
				...col,
				header: () => (
					<div className="text-muted-foreground flex items-baseline gap-1 text-nowrap">
						资金占比:{" "}
						<span className="text-primary text-right w-8 font-bold">
							{tempCapWeight}%
						</span>
					</div>
				),
			}
		}
		return col
	})

	const finalColumns = showCapWeight ? tempColumns : tempColumns.slice(1)

	return (
		<DataTable
			data={data}
			title={""}
			loading={false}
			columns={finalColumns}
			pagination={false}
		/>
	)
}

const FusionStrategyLibrary = () => {
	// const { isAutoRocket } = useToggleAutoRealTrading()
	const { fusion, updateFusion, removeFusionStrategy } = useFusionManager()
	// 在组件顶层定义一个状态对象，存储每个 strategyGroup 的 isFold 状态
	const [isFoldState, setIsFoldState] = useState<{ [key: number]: boolean }>(
		fusion.reduce((acc, group, index) => {
			acc[index] = group.isFold
			return acc
		}, {}),
	)
	// 在组件顶层定义删除确认 popover 的状态
	const [deletePopoverStates, setDeletePopoverStates] = useState<{
		[key: number]: boolean
	}>({})

	const [factorListDialogState, setFactorListDialogState] = useState<{
		open: boolean
		factorList?: Array<[string, boolean, any, string | number | null]>
	}>({
		open: false,
	})
	const [paramsDialogState, setParamsDialogState] = useState<{
		open: boolean
		params?: Record<string, any>
	}>({
		open: false,
	})

	const [rebTimeConfigModalOpen, setRebTimeConfigModalOpen] = useState(false)

	// 渲染通用结构
	const renderCommonStructure = (
		strategyIndex: number,
		strategyGroup: any,
		isFold: boolean,
		setIsFold: (isFold: boolean) => void,
		renderContent: () => JSX.Element,
	) => {
		const handleFoldToggle = () => setIsFold(!isFold)
		const isDeletePopoverOpen = deletePopoverStates[strategyIndex] || false
		const setIsDeletePopoverOpen = (open: boolean) => {
			setDeletePopoverStates((prev) => ({
				...prev,
				[strategyIndex]: open,
			}))
		}

		return (
			<div
				key={strategyIndex}
				className={cn(
					"p-3 pb-1 space-y-2 bg-gray-100 rounded-lg shadow-xl border dark:bg-neutral-900",
					strategyGroup.cap_weight > 0 &&
						"border-success-700 dark:border-success-200",
				)}
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-3">
						<ButtonTooltip content={<div>{strategyGroup.name}资金占比</div>}>
							<div>
								<NumberInput
									value={Number((strategyGroup.cap_weight * 100).toFixed(2))}
									size="sm"
									// disabled={isAutoRocket}
									aria-label={`输入${strategyGroup.name}资金占比`}
									classNames={{
										inputWrapper: [
											"bg-white",
											"dark:bg-black",
											"max-h-8",
											"max-w-40",
										],
									}}
									variant="bordered"
									minValue={0}
									maxValue={100}
									radius="md"
									endContent={<span className="text-sm">%</span>}
									onValueChange={async (val) => {
										const updatedFusion = fusion.map((group, index) => {
											if (index === strategyIndex) {
												return {
													...group,
													cap_weight: (val || 0) / 100, //保存时转换为小数（除以 100）
												}
											}
											return group
										})
										// 检查所有 cap_weight 的总和是否超过 1
										const totalCapWeight = updatedFusion.reduce(
											(sum, group) => sum + (group.cap_weight ?? 0),
											0,
										)
										if (totalCapWeight > 1) {
											toast.error("资金占比总和不能超过 100%")
											return
										}
										updateFusion(updatedFusion) // 更新仓位管理策略
										toast.success(
											`分配权重成功，${strategyGroup.name}为${val}%`,
										)
									}}
								/>
							</div>
						</ButtonTooltip>

						<StrategyNameDisplay
							name={strategyGroup.name}
							remarkName={strategyGroup.remark_name}
							fallbackRemarkName={
								strategyGroup.remark_name?.trim()
									? undefined
									: getFusionTopRealMarketStrategyName(
											strategyIndex,
											strategyGroup.name,
										)
							}
							nameClassName="text-xl font-semibold tracking-tight"
						/>
					</div>
					<div className="flex items-center gap-2">
						{strategyGroup.type === "pos" && (
							<>
								<PosStrategyEditDialog
									posStrategy={strategyGroup as PosStrategyType}
									fusionIndex={strategyIndex}
								/>
								<StrategyReplaceDialog
									strategy={strategyGroup as PosStrategyType}
									strategyType="pos"
									buttonClassName="rounded-full size-6"
									onReplace={(newStg) => {
										updateFusion(
											fusion.map((item, i) =>
												i === strategyIndex ? newStg : item,
											),
										)
									}}
								/>
							</>
						)}
						<Popover
							open={isDeletePopoverOpen}
							onOpenChange={setIsDeletePopoverOpen}
						>
							<PopoverTrigger asChild>
								<Button
									className="rounded-full size-6"
									size="icon"
									variant="ghost"
								>
									<Trash2 size={16} />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-80" align="end">
								<div className="space-y-4">
									<div className="space-y-2">
										<h4 className="font-medium leading-none">确认删除</h4>
										<p className="text-sm text-muted-foreground">
											确定要删除策略 "{strategyGroup.name}"
											吗？此操作无法撤销，该操作仅删除配置信息，相关资源文件不会删除。
										</p>
									</div>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setIsDeletePopoverOpen(false)}
										>
											取消
										</Button>
										<Button
											variant="destructive"
											size="sm"
											onClick={() => {
												removeFusionStrategy(strategyIndex)
												setIsDeletePopoverOpen(false)
											}}
										>
											确认删除
										</Button>
									</div>
								</div>
							</PopoverContent>
						</Popover>
						<Button
							onClick={handleFoldToggle}
							className={`transition-transform duration-500 ease-in-out rounded-full size-6 ${
								isFold ? "rotate-180" : "rotate-45"
							}`}
							size="icon"
							variant="ghost"
						>
							<Plus size={20} />
						</Button>
					</div>
				</div>
				<div
					className={`
						grid transition-all duration-600 ease-in-out
						${
							isFold
								? "grid-rows-[0fr] opacity-10"
								: "grid-rows-[1fr] opacity-100"
						}
					`}
				>
					<div className="overflow-hidden">
						<div className="pb-2">{renderContent()}</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="w-full h-full space-y-4 py-4">
			<ImportStrategyButton />
			{fusion.map((strategyGroup, strategyIndex) => {
				// 使用 isFoldState 来获取和更新每个 strategyGroup 的 isFold 状态
				const isFold = isFoldState[strategyIndex]
				const setIsFold = (newIsFold: boolean) => {
					setIsFoldState((prevState) => ({
						...prevState,
						[strategyIndex]: newIsFold,
					}))
				}

				let renderContent: () => JSX.Element

				switch (strategyGroup.type) {
					case "group": {
						const groupRebTimes = Array.from(
							new Set(
								strategyGroup.strategy_list.map(
									(item: any) => item.rebalance_time,
								),
							),
						) as string[]
						renderContent = () => (
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<Badge variant="default">
										持仓周期：
										{Array.from(
											new Set(
												strategyGroup.strategy_list.map(
													(item: any) => item.hold_period,
												),
											),
										).join(",")}
									</Badge>

									<Badge variant="outline">
										OFFSET：
										{Array.from(
											new Set(
												strategyGroup.strategy_list
													.flatMap((item: any) => item.offset_list)
													.filter(
														(value: any) =>
															value !== undefined && value !== null,
													),
											),
										).join("、")}
									</Badge>

									<Badge
										variant="outline"
										className="cursor-pointer hover:bg-white dark:hover:bg-gray-800"
										onClick={() => setRebTimeConfigModalOpen(true)}
									>
										换仓时间：{groupRebTimes.join(",")}
									</Badge>
									<span className="text-sm">
										共{strategyGroup.strategy_list.length}个选股策略
									</span>
								</div>
								<Separator />
								<StrategyTable
									data={strategyGroup.strategy_list}
									strategyIndex={strategyIndex}
									showCapWeight={true}
									parentGroupName={strategyGroup.name}
								/>
								<ReTimingDisplay reTiming={strategyGroup.re_timing} />
							</div>
						)
						break
					}
					case "pos": {
						const { strategy_pool } = strategyGroup
						const isList = strategy_pool.some(
							(v: SelectStgType | StgGroupType) => v.type === "group",
						)
						renderContent = () => (
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<Badge variant="default">
										持仓周期：{strategyGroup.hold_period}
									</Badge>

									<Badge variant="outline">
										Offset：{(strategyGroup.offset_list ?? []).join(",")}
									</Badge>

									<Badge
										variant="outline"
										className="cursor-pointer hover:bg-white dark:hover:bg-gray-800"
										onClick={() => setRebTimeConfigModalOpen(true)}
									>
										换仓时间：{strategyGroup.rebalance_time}
									</Badge>

									{strategyGroup.max_select_num && (
										<Badge variant="secondary">
											最大选股数量：{strategyGroup.max_select_num}
										</Badge>
									)}

									{strategyGroup.factor_list &&
										strategyGroup.factor_list.length > 0 && (
											<Badge
												variant="outline"
												className="cursor-pointer hover:bg-white dark:hover:bg-gray-800"
												onClick={() => {
													setFactorListDialogState({
														open: true,
														factorList: strategyGroup.factor_list,
													})
												}}
											>
												factor list ({strategyGroup.factor_list.length})
											</Badge>
										)}
									{strategyGroup.params &&
										Object.keys(strategyGroup.params).length > 0 && (
											<Badge
												variant="outline"
												className="cursor-pointer hover:bg-white dark:hover:bg-gray-800"
												onClick={() => {
													setParamsDialogState({
														open: true,
														params: strategyGroup.params,
													})
												}}
											>
												params ({Object.keys(strategyGroup.params).length})
											</Badge>
										)}
								</div>
								<Separator />
								{isList ? (
									strategy_pool.map((poolItem: any, index: number) => (
										<div key={index}>
											<StrategyNameDisplay
												name={poolItem.name}
												remarkName={poolItem.remark_name}
												className="mb-1"
												nameClassName="text-base font-bold dark:text-gray-50"
											/>
											<StrategyTable
												data={poolItem.strategy_list}
												strategyIndex={strategyIndex}
												showCapWeight={true}
												hideOperationColumn={true}
											/>
										</div>
									))
								) : (
									<StrategyTable
										data={strategy_pool as SelectStgType[]}
										strategyIndex={strategyIndex}
										showCapWeight={false}
										hideOperationColumn={true}
									/>
								)}
								<ReTimingDisplay reTiming={strategyGroup.re_timing} />
							</div>
						)
						break
					}
					default:
						renderContent = () => (
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<Badge variant="default">
										持仓周期：{strategyGroup.hold_period}
									</Badge>

									<Badge variant="outline">
										Offset：{(strategyGroup.offset_list ?? []).join(",")}
									</Badge>
									<Badge
										variant="outline"
										className="cursor-pointer hover:bg-white dark:hover:bg-gray-800"
										onClick={() => setRebTimeConfigModalOpen(true)}
									>
										换仓时间：{strategyGroup.rebalance_time}
									</Badge>
								</div>
								<Separator />
								<StrategyTable
									data={[strategyGroup as SelectStgType]}
									strategyIndex={strategyIndex}
									showCapWeight={false}
									realMarketFallback="fusion-top"
								/>
							</div>
						)
				}

				return renderCommonStructure(
					strategyIndex,
					strategyGroup,
					isFold,
					setIsFold,
					renderContent,
				)
			})}
			<hr />
			<RatioIntro />
			<div className="h-5" />
			{factorListDialogState.factorList && (
				<FactorListDialog
					open={factorListDialogState.open}
					onOpenChange={(open) => {
						setFactorListDialogState((prev) => ({ ...prev, open }))
					}}
					factorList={factorListDialogState.factorList}
				/>
			)}
			{paramsDialogState.params && (
				<ParamsDialog
					open={paramsDialogState.open}
					onOpenChange={(open) => {
						setParamsDialogState((prev) => ({ ...prev, open }))
					}}
					params={paramsDialogState.params}
				/>
			)}
			<RebTimeConfigModal
				open={rebTimeConfigModalOpen}
				onOpenChange={setRebTimeConfigModalOpen}
			/>
		</div>
	)
}

export default FusionStrategyLibrary
