/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */
import { ChangeLibrary } from "@/renderer/components/change-library"
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
import type { SelectStgType, StgGroupType } from "@/renderer/types/strategy"
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
}

const StrategyTable = ({
	data,
	strategyIndex,
	showCapWeight,
}: StrategyTableProps) => {
	const columns = useGenLibraryColumn(() => {}, true, strategyIndex)

	let tempCapWeight = 0
	if (data) {
		const allCapWeight = data.reduce((sum, subStrategy) => {
			// 修复：只有当 cap_weight 为 undefined 或 null 时才设置默认值，0 是有效值
			subStrategy.cap_weight = subStrategy.cap_weight ?? 1
			return sum + subStrategy.cap_weight
		}, 0)
		tempCapWeight = Math.round((allCapWeight / 1000) * 1000)
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
									value={strategyGroup.cap_weight}
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
													cap_weight: val || 0,
												}
											}
											return group
										})
										// 检查所有 cap_weight 的总和是否超过 100
										const totalCapWeight = updatedFusion.reduce(
											(sum, group) => sum + (group.cap_weight ?? 0),
											0,
										)
										if (totalCapWeight > 100) {
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

						<div className="text-foreground text-xl font-semibold tracking-tight first:mt-0">
							{strategyGroup.name}
						</div>
					</div>
					<div className="flex items-center gap-2">
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
			<ChangeLibrary currentLibraryType="pos" />
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
					case "group":
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

									<Badge variant="outline">
										换仓时间：
										{Array.from(
											new Set(
												strategyGroup.strategy_list.map(
													(item: any) => item.rebalance_time,
												),
											),
										).join(",")}
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
								/>
							</div>
						)
						break
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

									<Badge variant="outline">
										换仓时间：{strategyGroup.rebalance_time}
									</Badge>

									{strategyGroup.max_select_num && (
										<Badge variant="secondary">
											最大选股数量：{strategyGroup.max_select_num}
										</Badge>
									)}

									{strategyGroup.factor_list &&
										strategyGroup.factor_list.length > 0 && (
											<span className="text-sm font-mono">
												{JSON.stringify(strategyGroup.factor_list)}
											</span>
										)}
									<span className="text-sm font-mono">
										{JSON.stringify(strategyGroup.params)}
									</span>
								</div>
								<Separator />
								{isList ? (
									strategy_pool.map((poolItem: any, index: number) => (
										<div key={index}>
											<div className="text-ml font-bold dark:text-gray-50">
												{poolItem.name}
											</div>
											<StrategyTable
												data={poolItem.strategy_list}
												strategyIndex={strategyIndex}
												showCapWeight={true}
											/>
										</div>
									))
								) : (
									<StrategyTable
										data={strategy_pool as SelectStgType[]}
										strategyIndex={strategyIndex}
										showCapWeight={false}
									/>
								)}
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
									<Badge variant="outline">
										换仓时间：{strategyGroup.rebalance_time}
									</Badge>
								</div>
								<Separator />
								<StrategyTable
									data={[strategyGroup as SelectStgType]}
									strategyIndex={strategyIndex}
									showCapWeight={false}
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
		</div>
	)
}

export default FusionStrategyLibrary
