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
import { PerformanceModeSelectTabs } from "@/renderer/components/select-tabs"
import { Button } from "@/renderer/components/ui/button"
import ButtonTooltip from "@/renderer/components/ui/button-tooltip"
import { H2 } from "@/renderer/components/ui/typography"
import {
	useAuthUpdate,
	useHandleTimeTask,
	useScheduleTimes,
} from "@/renderer/hooks" // 引入handleTimeTask
import { useDataSubscribed } from "@/renderer/hooks/useDataSubscribed"
import { useSettings } from "@/renderer/hooks/useSettings"
import DataList from "@/renderer/page/data/table"
import { isUpdatingAtom } from "@/renderer/store"
import { useAtomValue } from "jotai"
import {
	CircleHelp,
	HardDrive,
	Info,
	Play,
	RefreshCcwDot,
	RefreshCw,
	Server,
} from "lucide-react"
import type { FC } from "react"

const Data: FC = () => {
	const disabled = useAuthUpdate()
	const isUpdating = useAtomValue(isUpdatingAtom) // 获取是否正在更新的状态
	const handleTimeTask = useHandleTimeTask() // 使用引入的 handleTimeTask
	const { performanceMode, setPerformanceMode } = useSettings()
	const { dataScheduleTimes } = useScheduleTimes()
	const { dataSubscribed } = useDataSubscribed()

	return (
		<div className="h-full flex-1 flex-col space-y-4 md:flex pt-3">
			<div className="flex items-center justify-between space-y-2">
				<div className="space-y-2">
					<H2>
						数据订阅
						<span className="text-muted-foreground text-sm ml-4">
							订阅情况：数据（{Object.keys(dataSubscribed).length ?? 0} 份）
						</span>
					</H2>

					<p className="text-muted-foreground text-sm">
						{dataScheduleTimes.length > 0
							? `指定时间更新数据：${dataScheduleTimes.join(", ")}`
							: "自动每分钟检查更新，并实时更新数据"}
					</p>
					<div className="w-full rounded-md border border-warning-500 bg-warning-50 text-warning px-2 py-1.5 flex items-center gap-2 text-sm">
						<Info className="w-4 h-4" />
						<span className="font-medium">提示：</span>
						<span>
							无论是自动还是定时更新，
							<span className="font-semibold">盘中交易时间段</span>
							都不会自动更新历史数据。如需更新，请手动点击更新按钮。
						</span>
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between">
				<div className="flex gap-2 m-0">
					<div className="">
						{isUpdating ? (
							<ButtonTooltip content="停止自动更新数据">
								<Button
									variant={
										dataScheduleTimes.length > 0 ? "successOutline" : "success"
									}
									size="icon"
									className="hover:cursor-pointer w-12 h-10 flex items-center justify-center"
									disabled={disabled}
									onClick={() => handleTimeTask(true)}
								>
									<RefreshCw size={16} className="animate-spin" />
								</Button>
							</ButtonTooltip>
						) : (
							<ButtonTooltip content="启动自动更新数据">
								<Button
									className="hover:cursor-pointer w-12 h-10 flex items-center justify-center"
									onClick={async () => {
										await handleTimeTask(false)
									}}
								>
									<Play className="h-5 w-5" />
								</Button>
							</ButtonTooltip>
						)}
					</div>
					<DataLocationCtrl className="w-72" />
				</div>
				<div className="flex items-center space-x-4">
					<div className="flex items-center space-x-1">
						<span className="font-semibold">性能模式</span>{" "}
						<span className="text-destructive">*</span>
						<ButtonTooltip
							content={
								<div>
									<p>选择“节能”，实盘使用 1/3 系统核心数进行计算</p>
									<p>选择“均衡”，实盘使用 1/2 系统核心数进行计算</p>
									<p>选择“性能”，实盘使用 系统核心数 - 1 进行计算</p>
								</div>
							}
						>
							<CircleHelp
								className="h-4 w-4 text-muted-foreground hover:cursor-pointer"
								onClick={(e) => e.stopPropagation()}
							/>
						</ButtonTooltip>
					</div>
					<PerformanceModeSelectTabs
						name="数据"
						defaultValue={performanceMode}
						onValueChange={(value) => setPerformanceMode(value)}
					/>
				</div>
			</div>

			<DataList />
			<hr />
			<div className="leading-loose text-sm text-muted-foreground space-y-2">
				<div>
					<h3 className="font-bold text-lg text-accent-foreground">
						# 数据订阅名词解释
					</h3>
					<div>
						<div className="flex items-center space-x-2">
							<div className="w-1 h-1 bg-muted-foreground rounded-full" />
							<HardDrive size={16} />
							<span>
								<span className="font-semibold">数据时间：</span>
								<span>
									本地保存的数据，最后一行对应的时间戳。（data content time）
								</span>
							</span>
						</div>
						<div className="flex items-center space-x-2">
							<div className="w-1 h-1 bg-muted-foreground rounded-full" />
							<Server size={16} />
							<span>
								<span className="font-semibold">更新时间（云端）：</span>
								<span>
									量化小讲堂服务器更新本数据的时间。（data update time）
								</span>
							</span>
						</div>
						<div className="flex items-center space-x-2">
							<div className="w-1 h-1 bg-muted-foreground rounded-full" />
							<RefreshCcwDot size={16} />
							<span>
								<span className="font-semibold">更新时间（本地）：</span>
								<span>客户端最近一次检查更新的时间。（last update time）</span>
							</span>
						</div>
					</div>
				</div>
				<div>
					<h3 className="font-bold text-lg text-accent-foreground">
						# 数据更新的逻辑
					</h3>
					<div>
						<div className="flex items-center space-x-2">
							<div className="w-1 h-1 bg-muted-foreground rounded-full" />
							<span>
								客户端每分钟都会检查数据，若发现有更新，将自动下载并完成更新。
							</span>
						</div>
						<div className="flex items-center space-x-2">
							<div className="w-1 h-1 bg-muted-foreground rounded-full" />
							<span>
								量化小讲堂大部分数据每天更新一次，部分数据更新频率可能有所不同。
							</span>
						</div>
						<div className="flex items-center space-x-2">
							<div className="w-1 h-1 bg-muted-foreground rounded-full" />
							<span>
								本地数据时间在白天看通常是前一天，晚上应该会更新至当天。如有个别数据更新延迟，系统将自动处理，无需干预。
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default Data
