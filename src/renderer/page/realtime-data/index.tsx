/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { MinDataExecConfirmDialog } from "@/renderer/components/MinDataExecConfirmDialog"
import { MinDataTaskTable } from "@/renderer/components/MinDataTaskTable"
import { SelectTabs } from "@/renderer/components/select-tabs"
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/renderer/components/ui/accordion"
import { Button } from "@/renderer/components/ui/button"
import ButtonTooltip from "@/renderer/components/ui/button-tooltip"
import { Checkbox } from "@/renderer/components/ui/checkbox"
import { Label } from "@/renderer/components/ui/label"
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/renderer/components/ui/tabs"
import {
	isMinDataUpdatingAtom,
	minDataAutoAccurateAtom,
	minDataAutoFuzzyAtom,
	minDataModeAtom,
	minDataTabAtom,
	realConfigEditModalAtom,
} from "@/renderer/store"
import { realMarketConfigSchemaAtom } from "@/renderer/store/storage"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { CircleHelp, Play, RefreshCw, Settings } from "lucide-react"
import { type FC, useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

const {
	execMinData,
	execMinDataFuzzy,
	toggleMinDataSchedule,
	onMinDataScheduleStatus,
	removeMinDataScheduleStatusListener,
} = window.electronAPI

const REALTIME_DATA_UPDATE_NOTES = (
	<div className="space-y-3 text-sm font-medium">
		<div>
			<p>更新规则：交易时段内每 5 分钟执行一次。</p>
			<p className="text-muted-foreground">
				· 上午：9:30 - 11:30
				<br />· 下午：13:00 - 15:00
				<br />· 周一至周五
			</p>
		</div>
		<div>
			<p>执行顺序：先获取模糊数据，再获取准确数据。</p>
		</div>
		<div>
			<p>性能模式：</p>
			<p className="text-muted-foreground">
				· 极速模式：约 1 分钟左右，速度快
				<br />· 稳定模式：约 3 分钟左右，更稳定
			</p>
		</div>
	</div>
)

const REALTIME_DATA_FAQ = [
	{
		trigger: "QMT 需要先登录吗？",
		content:
			"需要。获取分钟级 K 线数据需要连接 QMT，请确保 QMT 客户端已登录并正常运行。",
	},
	{
		trigger: "数据获取失败怎么办？",
		content:
			"1. 检查实盘配置中 QMT 账户号和安装路径是否正确；2. 检查 QMT 客户端是否已登录；3. 检查网络是否正常。4. 重启 QMT 客户端",
	},
]

const RealtimeData: FC = () => {
	const [mode, setMode] = useAtom(minDataModeAtom)
	const [activeTab, setActiveTab] = useAtom(minDataTabAtom)
	const [autoAccurate, setAutoAccurate] = useAtom(minDataAutoAccurateAtom)
	const [autoFuzzy, setAutoFuzzy] = useAtom(minDataAutoFuzzyAtom)
	const [isMinDataUpdating, setIsMinDataUpdating] = useAtom(isMinDataUpdatingAtom)
	const realMarketConfig = useAtomValue(realMarketConfigSchemaAtom)
	const setRealConfigEditModal = useSetAtom(realConfigEditModalAtom)
	const [isAccurateExecuting, setIsAccurateExecuting] = useState(false)
	const [isFuzzyExecuting, setIsFuzzyExecuting] = useState(false)
	const [execConfirmOpen, setExecConfirmOpen] = useState(false)
	const [execConfirmType, setExecConfirmType] = useState<
		"accurate" | "fuzzy" | null
	>(null)

	useEffect(() => {
		onMinDataScheduleStatus((_event, status) => {
			if (status.type === "skipped") {
				toast.info("自动更新：Fuel 内核正忙，跳过本轮")
			} else if (status.type === "executing") {
				if (status.task === "accurate") {
					setIsFuzzyExecuting(false)
					setIsAccurateExecuting(true)
				} else if (status.task === "fuzzy") {
					setIsAccurateExecuting(false)
					setIsFuzzyExecuting(true)
				}
				toast.info(
					`自动更新：正在获取${status.task === "accurate" ? "准确" : "模糊"}数据...`,
				)
			} else if (status.type === "done") {
				setIsAccurateExecuting(false)
				setIsFuzzyExecuting(false)
				toast.success("自动更新：本轮数据获取完成")
			}
		})
		return () => removeMinDataScheduleStatusListener()
	}, [])

	const isQmtConfigured =
		!!realMarketConfig?.account_id?.trim() &&
		!!realMarketConfig?.qmt_path?.trim()

	const handleStartAutoUpdate = useCallback(async () => {
		if (!autoAccurate && !autoFuzzy) {
			toast.warning("请至少选择一种要自动更新的数据类型")
			return
		}
		if (!isQmtConfigured) {
			toast.warning("QMT 未配置，请先在实盘配置中填写 QMT 账户号和安装路径")
			return
		}
		await toggleMinDataSchedule({
			isOn: true,
			mode,
			autoAccurate,
			autoFuzzy,
		})
		setIsMinDataUpdating(true)
		toast.success("自动更新数据已启动")
	}, [mode, autoAccurate, autoFuzzy, setIsMinDataUpdating, isQmtConfigured])

	const handleStopAutoUpdate = useCallback(async () => {
		await toggleMinDataSchedule({ isOn: false })
		setIsMinDataUpdating(false)
		toast.success("自动更新数据已停止")
	}, [setIsMinDataUpdating])

	const handleExecAccurate = useCallback(async () => {
		setIsAccurateExecuting(true)
		try {
			const result = await execMinData(mode)
			if (result.code === 200) {
				toast.success(result.message)
			} else if (result.code === 300) {
				toast.warning(result.message)
			} else {
				toast.error(result.message)
			}
		} catch (error) {
			toast.error("执行失败")
		} finally {
			setIsAccurateExecuting(false)
		}
	}, [mode])

	const handleExecFuzzy = useCallback(async () => {
		setIsFuzzyExecuting(true)
		try {
			const result = await execMinDataFuzzy()
			if (result.code === 200) {
				toast.success(result.message)
			} else if (result.code === 300) {
				toast.warning(result.message)
			} else {
				toast.error(result.message)
			}
		} catch (error) {
			toast.error("执行失败")
		} finally {
			setIsFuzzyExecuting(false)
		}
	}, [])

	const handleExecConfirmClick = useCallback(
		(type: "accurate" | "fuzzy") => {
			if (!isQmtConfigured) {
				toast.warning("QMT 未配置，请先在实盘配置中填写 QMT 账户号和安装路径")
				return
			}
			setExecConfirmType(type)
			setExecConfirmOpen(true)
		},
		[isQmtConfigured],
	)

	const handleConfirmExec = useCallback(() => {
		setExecConfirmOpen(false)
		const t = execConfirmType
		setExecConfirmType(null)
		if (t === "accurate") handleExecAccurate()
		else if (t === "fuzzy") handleExecFuzzy()
	}, [execConfirmType, handleExecAccurate, handleExecFuzzy])

	return (
		<div className="h-full flex-1 flex-col space-y-4 md:flex pt-3">
			<p className="font-bold text-base">
				获取 QMT 分钟级 K 线数据，支持准确数据和模糊数据两种模式。
				{isMinDataUpdating
					? "自动更新中"
					: "点击启动自动更新数据，在交易时段内自动更新数据"}
			</p>

			<div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
				<div className="flex items-center justify-between gap-4">
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<span className="font-medium">QMT 账户号：</span>
							<span className="text-muted-foreground">
								{realMarketConfig?.account_id?.trim() || "未配置"}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="font-medium">QMT 安装路径：</span>
							<span className="truncate text-muted-foreground">
								{realMarketConfig?.qmt_path?.trim() || "未配置"}
							</span>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						className="shrink-0"
						onClick={() => setRealConfigEditModal(true)}
					>
						<Settings className="mr-1.5 h-3.5 w-3.5" />
						实盘配置
					</Button>
				</div>
				{(!realMarketConfig?.account_id?.trim() ||
					!realMarketConfig?.qmt_path?.trim()) && (
					<p className="mt-2 text-amber-600 dark:text-amber-500">
						执行前请先在实盘配置中填写 QMT 账户号和 QMT
						安装路径，否则数据获取将失败。
					</p>
				)}
			</div>

			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<div>
						{isMinDataUpdating ? (
							<ButtonTooltip content="停止自动更新数据">
								<Button
									variant="default"
									size="icon"
									className="hover:cursor-pointer w-12 h-10 flex items-center justify-center"
									onClick={handleStopAutoUpdate}
								>
									<RefreshCw size={16} className="animate-spin" />
								</Button>
							</ButtonTooltip>
						) : (
							<ButtonTooltip content="启动自动更新数据">
								<Button
									size="icon"
									className="hover:cursor-pointer w-12 h-10 flex items-center justify-center"
									onClick={handleStartAutoUpdate}
								>
									<Play className="h-5 w-5" />
								</Button>
							</ButtonTooltip>
						)}
					</div>
					<div className="flex items-center gap-4">
						<div className="flex items-center space-x-2">
							<Checkbox
								id="auto-accurate"
								checked={autoAccurate}
								onCheckedChange={(v) => setAutoAccurate(v === true)}
								disabled={isMinDataUpdating}
							/>
							<Label
								htmlFor="auto-accurate"
								className="text-sm font-medium cursor-pointer"
							>
								准确 QMT 数据
							</Label>
						</div>
						<div className="flex items-center space-x-2">
							<Checkbox
								id="auto-fuzzy"
								checked={autoFuzzy}
								onCheckedChange={(v) => setAutoFuzzy(v === true)}
								disabled={isMinDataUpdating}
							/>
							<Label
								htmlFor="auto-fuzzy"
								className="text-sm font-medium cursor-pointer"
							>
								模糊 QMT 数据
							</Label>
						</div>
					</div>
				</div>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={(v) => setActiveTab(v as "accurate" | "fuzzy")}
			>
				<TabsList>
					<TabsTrigger value="accurate" className="relative">
						准确 QMT 数据
						{isAccurateExecuting && (
							<span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
						)}
					</TabsTrigger>
					<TabsTrigger value="fuzzy" className="relative">
						模糊 QMT 数据
						{isFuzzyExecuting && (
							<span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
						)}
					</TabsTrigger>
				</TabsList>
				<TabsContent value="accurate">
					<MinDataTaskTable
						title="准确 QMT 数据"
						description="获取5分钟准确K线数据，可选极速模式或稳定模式"
						tableType="accurate"
						isExecuting={isAccurateExecuting}
						onExecute={() => handleExecConfirmClick("accurate")}
					>
						<div className="flex items-center gap-2">
							<span className="font-semibold whitespace-nowrap flex items-center gap-1">
								性能模式
								<ButtonTooltip
									content={
										<div className="space-y-1">
											<div>极速模式：约 1 分钟左右，速度快</div>
											<div>稳定模式：约 3 分钟左右，更稳定</div>
										</div>
									}
								>
									<CircleHelp className="h-4 w-4 text-muted-foreground hover:cursor-pointer" />
								</ButtonTooltip>
							</span>
							<SelectTabs
								tabs={[
									{ label: "极速", value: "fast" },
									{ label: "稳定", value: "stable" },
								]}
								defaultValue={mode}
								onValueChange={(value) => {
									setMode(value as "fast" | "stable")
									toast.success(
										`已切换为${value === "fast" ? "极速" : "稳定"}模式`,
									)
									if (isMinDataUpdating) {
										toggleMinDataSchedule({
											isOn: true,
											mode: value as "fast" | "stable",
											autoAccurate,
											autoFuzzy,
										})
									}
								}}
							/>
						</div>
					</MinDataTaskTable>
				</TabsContent>
				<TabsContent value="fuzzy">
					<MinDataTaskTable
						title="模糊 QMT 数据"
						description="获取模糊K线数据"
						tableType="fuzzy"
						isExecuting={isFuzzyExecuting}
						onExecute={() => handleExecConfirmClick("fuzzy")}
					/>
				</TabsContent>
			</Tabs>

			<Accordion
				type="multiple"
				defaultValue={["update-notes", "faq"]}
				className="w-full"
			>
				<AccordionItem value="update-notes">
					<AccordionTrigger>自动更新说明</AccordionTrigger>
					<AccordionContent>{REALTIME_DATA_UPDATE_NOTES}</AccordionContent>
				</AccordionItem>
				<AccordionItem value="faq">
					<AccordionTrigger>常见问题</AccordionTrigger>
					<AccordionContent>
						<div className="space-y-3 text-sm">
							{REALTIME_DATA_FAQ.map((item) => (
								<div key={item.trigger}>
									<p className="font-medium">{item.trigger}</p>
									<p className="text-muted-foreground">{item.content}</p>
								</div>
							))}
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>

			<MinDataExecConfirmDialog
				open={execConfirmOpen}
				onOpenChange={(open) => {
					setExecConfirmOpen(open)
					if (!open) setExecConfirmType(null)
				}}
				type={execConfirmType}
				onConfirm={handleConfirmExec}
			/>
		</div>
	)
}

export default RealtimeData
