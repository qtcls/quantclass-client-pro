/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { DataLocationCtrl } from "@/renderer/components/data-location-ctrl"
import { Button } from "@/renderer/components/ui/button"
import ButtonTooltip from "@/renderer/components/ui/button-tooltip"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { DATA_SECTION_ROUTE } from "@/renderer/constant"
import {
	useAuthUpdate,
	useHandleTimeTask,
	useScheduleTimes,
} from "@/renderer/hooks"
import { useProductList } from "@/renderer/hooks/useProductList"
import ScheduleControl from "@/renderer/page/home/schedule"
import { isUpdatingAtom } from "@/renderer/store"
import { accountKeyAtom } from "@/renderer/store/storage"
import { canIncrementalUpdate } from "@/renderer/utils/data-sync-status"
import { cn } from "@renderer/lib/utils"
import { useAtomValue } from "jotai"
import {
	ArrowRight,
	CalendarSync,
	Database,
	Play,
	RefreshCw,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router"

export function DataCard() {
	const navigate = useNavigate()
	const disabled = useAuthUpdate()
	const [confirmStartAutoUpdate, setConfirmStartAutoUpdate] = useState(false)
	const [scheduleOpen, setScheduleOpen] = useState(false)
	const { apiKey, uuid } = useAtomValue(accountKeyAtom)
	const isUpdating = useAtomValue(isUpdatingAtom)
	const { dataScheduleTimes } = useScheduleTimes()
	const handleTimeTask = useHandleTimeTask()
	const { productList } = useProductList()

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-shot on mount
	useEffect(() => {
		if (apiKey === "" && uuid === "" && isUpdating) {
			handleTimeTask(true)
		}
	}, [apiKey, uuid])

	return (
		<>
			<div className="bg-background border border-border rounded-xl overflow-hidden flex flex-col hover:border-foreground/30 transition-colors">
				<div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border">
					<span className="w-8 h-8 rounded-lg bg-muted grid place-items-center flex-shrink-0">
						<Database size={18} strokeWidth={1.8} />
					</span>
					<span className="flex-1 min-w-0">
						<b className="text-base font-[650] block tracking-tight">数据</b>
						<span className="text-xs text-muted-foreground">
							全局底座 · 流水线
						</span>
					</span>
				</div>
				<div className="px-4 py-3.5 flex-1 flex flex-col gap-3">
					<div>
						<div className="text-sm font-semibold mb-2">
							存储路径{" "}
							<span className="text-muted-foreground text-xs font-normal">
								建议预留最少 20GB 空间
							</span>
						</div>
						<div className="flex items-center gap-2 w-full">
							<DataLocationCtrl className="min-w-0 flex-1" />
						</div>
					</div>
					<div className="max-h-40 overflow-y-auto">
						{productList.length === 0 ? (
							<div className="py-2 text-sm text-muted-foreground">
								暂无订阅数据
							</div>
						) : (
							productList.map((item, index) => {
								const isLagging = canIncrementalUpdate(item)

								return (
									<div
										key={item.name}
										className={cn(
											"flex items-center py-2 text-sm",
											index > 0 && "border-t border-border",
										)}
									>
										<i
											className={cn(
												"w-2 h-2 rounded-full flex-shrink-0 mr-2 mt-px",
												isLagging ? "bg-amber-500" : "bg-green-500",
											)}
										/>
										<span className="flex-1 min-w-0 truncate">
											{item.displayName}
										</span>
										<span className="text-xs text-muted-foreground font-mono flex-shrink-0 ml-2">
											{isLagging ? "滞后" : "就绪"}
										</span>
									</div>
								)
							})
						)}
					</div>
				</div>
				<button
					type="button"
					onClick={() => setScheduleOpen(true)}
					className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border-t border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
				>
					<CalendarSync className="size-3.5" strokeWidth={1.9} />
					运行计划设置
				</button>
				{isUpdating ? (
					<ButtonTooltip content="停止自动更新数据">
						<button
							type="button"
							disabled={disabled}
							onClick={() => handleTimeTask(true)}
							className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border-t border-border text-sm font-medium text-green-600 bg-green-500/5 hover:bg-green-500/10 transition-colors disabled:opacity-50"
						>
							<RefreshCw className="size-3.5 animate-spin" />
							{dataScheduleTimes.length > 0
								? "定时更新中 · 点击暂停"
								: "更新中 · 点击暂停"}
						</button>
					</ButtonTooltip>
				) : (
					<ButtonTooltip content="启动自动更新数据">
						<button
							type="button"
							onClick={() => setConfirmStartAutoUpdate(true)}
							className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border-t border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
						>
							<Play className="size-3.5" />
							启动自动更新
						</button>
					</ButtonTooltip>
				)}
				<button
					type="button"
					onClick={() => navigate(DATA_SECTION_ROUTE)}
					className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors w-full text-left"
				>
					<span>进入数据模块</span>
					<ArrowRight size={15} strokeWidth={2} />
				</button>
			</div>

			<Dialog
				open={confirmStartAutoUpdate}
				onOpenChange={setConfirmStartAutoUpdate}
			>
				<DialogContent className="max-w-lg p-4">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Play size={20} />
							启动自动更新数据
						</DialogTitle>
					</DialogHeader>
					<div className="text-primary">
						启动后，会<span className="font-bold"> 实时检查 </span>并
						<span className="font-bold"> 更新数据 </span>
						，自动完成数据的处理与存储，尽量保证本地数据是最新的。
					</div>
					<DialogFooter>
						<Button
							className="hover:cursor-pointer w-full"
							variant="success"
							onClick={async () => {
								await handleTimeTask(false)
								setConfirmStartAutoUpdate(false)
							}}
						>
							<Play className="mr-2 size-4" />
							启动
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
				<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6">
					<ScheduleControl />
				</DialogContent>
			</Dialog>
		</>
	)
}
