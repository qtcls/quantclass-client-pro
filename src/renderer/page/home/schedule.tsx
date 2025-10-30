/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import {
	TimeMode,
	TimeMultiSelect,
} from "@/renderer/components/time-multi-select"
import { Switch } from "@/renderer/components/ui/switch"
import { H4 } from "@/renderer/components/ui/typography"
import { useScheduleTimes } from "@/renderer/hooks/useScheduleTimes"
import { CalendarSync } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export default function ScheduleControl() {
	const [dataModuleAuto, setDataModuleAuto] = useState(false)
	const [selectModuleAuto, setSelectModuleAuto] = useState(false)
	const {
		dataScheduleTimes,
		selectScheduleTimes,
		setDataScheduleTimes,
		setSelectScheduleTimes,
	} = useScheduleTimes()

	useEffect(() => {
		setDataModuleAuto(dataScheduleTimes.length === 0)
		setSelectModuleAuto(selectScheduleTimes.length === 0)
	}, [dataScheduleTimes, selectScheduleTimes])

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<CalendarSync size={24} />
				<H4>运行计划设置</H4>
			</div>
			<p className="text-muted-foreground text-sm">
				默认都是自动模式，会实时检查数据更新，并且第一时间选股生成交易计划
			</p>
			<div className="flex flex-col gap-2">
				<div className="flex items-center">
					<div className="font-bold">数据模块：</div>
					<div className="flex items-center gap-2">
						<Switch
							checked={dataModuleAuto}
							onCheckedChange={(isAuto) => {
								if (isAuto) {
									setDataScheduleTimes([])
									toast.success("数据模块切换为自动模式，自动更新数据")
								} else {
									toast.warning("数据模块切换为定时模式，请选择运行时间")
								}
								setDataModuleAuto(isAuto)
							}}
						/>
						<span
							className={`${
								dataModuleAuto ? "text-primary" : "text-muted-foreground"
							}`}
						>
							实时更新数据
						</span>
					</div>
				</div>
				<div className=" text-warning text-xs bg-warning-50 p-1 rounded border border-warning">
					<span className="font-medium0">提示：</span>
					<span>
						无论是自动还是定时更新，
						<span className="font-semibold">盘中交易时间段</span>
						都不会自动更新历史数据。如需更新，请手动点击更新按钮。
					</span>
				</div>
				{!dataModuleAuto && (
					<div className="p-2 bg-gray-100 dark:bg-neutral-800 rounded-xl">
						<TimeMultiSelect
							defaultValue={dataScheduleTimes}
							onChange={(selectedTimes: string[]) => {
								setDataScheduleTimes(selectedTimes)
								console.log("数据模块已选择的时间:", selectedTimes)
							}}
							timeMode={TimeMode.excludeTrade}
						/>
					</div>
				)}
				<div className="flex items-center">
					<div className="font-bold">选股模块：</div>
					<div className="flex items-center gap-2">
						<Switch
							checked={selectModuleAuto}
							onCheckedChange={(isAuto) => {
								if (isAuto) {
									setSelectScheduleTimes([])
									toast.success(
										"选股模块切换为自动模式，实时选股，生成交易计划",
									)
								} else {
									toast.warning("选股模块切换为定时模式，请选择运行时间")
								}
								setSelectModuleAuto(isAuto)
							}}
						/>
						<span
							className={`${
								selectModuleAuto ? "text-primary" : "text-muted-foreground"
							}`}
						>
							实时选股，生成交易计划
						</span>
					</div>
				</div>
				{!selectModuleAuto && (
					<div className="p-2 bg-gray-100 dark:bg-neutral-800 rounded-xl">
						<TimeMultiSelect
							defaultValue={selectScheduleTimes}
							onChange={(selectedTimes: string[]) => {
								setSelectScheduleTimes(selectedTimes)
								console.log("选股模块已选择的时间:", selectedTimes)
							}}
						/>
					</div>
				)}
				<div>
					<span className="font-bold flex-shrink-0">交易模块：</span>
					无需额外配置，交易时间内，每分钟会检查是否启动。注意，需要手动启动QMT客户端哦
				</div>
			</div>
		</div>
	)
}
