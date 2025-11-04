/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { useState } from "react"

function generateTradeTimeOptions(): string[] {
	const options: string[] = []

	// 上午交易时间：09:30-11:30
	for (let h = 9; h <= 11; h++) {
		for (let m = 0; m < 60; m += 15) {
			// 跳过09:00, 09:15
			if (h === 9 && m < 30) continue
			const hour = h.toString().padStart(2, "0")
			const min = m.toString().padStart(2, "0")
			options.push(`${hour}:${min}`)
		}
	}

	// 下午交易时间：13:00-15:00
	for (let h = 13; h <= 15; h++) {
		for (let m = 0; m < 60; m += 15) {
			// 15:00后不是交易时间
			if (h === 15 && m > 0) continue
			const hour = h.toString().padStart(2, "0")
			const min = m.toString().padStart(2, "0")
			options.push(`${hour}:${min}`)
		}
	}

	return options
}

function generateTimeOptions(excludeTradeTimes: boolean = false): string[] {
	const options: string[] = []
	const tradeTimeOptions = generateTradeTimeOptions()
	for (let h = 0; h < 24; h++) {
		for (let m = 0; m < 60; m += 15) {
			const hour = h.toString().padStart(2, "0")
			const min = m.toString().padStart(2, "0")
			if (excludeTradeTimes) {
				if (tradeTimeOptions.includes(`${hour}:${min}`)) {
					continue
				}
			}
			options.push(`${hour}:${min}`)
		}
	}
	return options
}

interface TimeRange {
	label: string
	start: string
	end: string
}

const timeRanges: TimeRange[] = [
	{ label: "0-6点", start: "00:00", end: "06:00" },
	{ label: "6-9点", start: "06:00", end: "09:00" },
	{ label: "9-12点", start: "09:00", end: "12:00" },
	{ label: "12-15点", start: "12:00", end: "15:00" },
	{ label: "15-20点", start: "15:00", end: "20:00" },
	{ label: "20-24点", start: "20:00", end: "24:00" },
]

function getTimesInRange(
	start: string,
	end: string,
	timeMode: TimeMode,
): string[] {
	const options =
		timeMode === TimeMode.trade
			? generateTradeTimeOptions() // 交易时间
			: generateTimeOptions(timeMode === TimeMode.excludeTrade) // 非交易时间 or 全部时间
	const startTime = start
	const endTime = end === "24:00" ? "23:45" : end

	return options.filter((time) => {
		if (end === "24:00") {
			return time >= startTime && time <= endTime
		}
		return time >= startTime && time < endTime
	})
}

/**
 * 时间多选控件
 * 支持快捷选择和手动选择
 * 快捷选择：0-6点，6-9点，9-12点，12-15点，15-20点，20-24点
 * 手动选择：可多选，支持范围选择
 */
enum TimeMode {
	all = "all",
	trade = "trade",
	excludeTrade = "excludeTrade",
}

interface TimeMultiSelectProps {
	onChange?: (selectedTimes: string[]) => void
	defaultValue?: string[]
	timeMode?: TimeMode
}

function TimeMultiSelect({
	onChange,
	defaultValue = [],
	timeMode = TimeMode.all,
}: TimeMultiSelectProps) {
	const [selectedTimes, setSelectedTimes] = useState<string[]>(defaultValue)

	const options =
		timeMode === TimeMode.trade
			? generateTradeTimeOptions() // 交易时间
			: generateTimeOptions(timeMode === TimeMode.excludeTrade) // 非交易时间 or 全部时间

	function handleSelect(time: string) {
		const newSelectedTimes = selectedTimes.includes(time)
			? selectedTimes.filter((t) => t !== time)
			: [...selectedTimes, time]

		setSelectedTimes(newSelectedTimes)

		// Call onChange callback if provided
		if (onChange) {
			onChange(newSelectedTimes)
		}
	}

	function handleRangeSelect(range: TimeRange) {
		const timesInRange = getTimesInRange(range.start, range.end, timeMode)
		const allSelected = timesInRange.every((time) =>
			selectedTimes.includes(time),
		)

		let newSelectedTimes: string[]
		if (allSelected) {
			// 如果范围内所有时间都已选中，则取消选中
			newSelectedTimes = selectedTimes.filter(
				(time) => !timesInRange.includes(time),
			)
		} else {
			// 否则选中范围内所有未选中的时间
			const newTimes = timesInRange.filter(
				(time) => !selectedTimes.includes(time),
			)
			newSelectedTimes = [...selectedTimes, ...newTimes]
		}

		setSelectedTimes(newSelectedTimes)
		if (onChange) {
			onChange(newSelectedTimes)
		}
	}

	function isRangeHighlighted(range: TimeRange): boolean {
		const timesInRange = getTimesInRange(range.start, range.end, timeMode)
		return (
			timesInRange.length > 0 &&
			timesInRange.every((time) => selectedTimes.includes(time))
		)
	}

	function isRangePartiallySelected(range: TimeRange): boolean {
		const timesInRange = getTimesInRange(range.start, range.end, timeMode)
		const selectedInRange = timesInRange.filter((time) =>
			selectedTimes.includes(time),
		)
		return (
			selectedInRange.length > 0 && selectedInRange.length < timesInRange.length
		)
	}

	return (
		<div>
			<div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
				快捷选择时间段
			</div>
			<div className="flex flex-wrap gap-1 mb-3">
				{timeRanges.map((range) => {
					const isHighlighted = isRangeHighlighted(range)
					const isPartial = isRangePartiallySelected(range)

					return (
						<button
							type="button"
							key={range.label}
							onClick={() => handleRangeSelect(range)}
							className={`px-2 py-1 text-xs rounded border transition ${
								isHighlighted
									? "bg-primary text-primary-foreground border-primary"
									: isPartial
										? "bg-primary/20 text-primary border-primary/50 dark:bg-primary/30 dark:border-primary/60"
										: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-600 dark:hover:bg-neutral-700"
							}`}
						>
							{range.label}
						</button>
					)
				})}
			</div>

			<div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
				手动更新时间点（可多选）
			</div>
			<div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2 bg-white dark:bg-neutral-900 dark:border-neutral-600">
				{options.map((time) => (
					<label
						key={time}
						className={`flex items-center gap-1 cursor-pointer rounded px-1 py-0.5 transition ${
							selectedTimes.includes(time)
								? "bg-primary/10 text-primary font-semibold dark:bg-primary/20"
								: "hover:bg-gray-100 dark:hover:bg-neutral-700"
						}`}
					>
						<input
							type="checkbox"
							checked={selectedTimes.includes(time)}
							onChange={() => handleSelect(time)}
							className="accent-primary"
						/>
						{time}
					</label>
				))}
			</div>
			{selectedTimes.length > 0 && (
				<div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
					已选择: {selectedTimes.sort().join(", ")}
				</div>
			)}
		</div>
	)
}

export { TimeMultiSelect, TimeMode }
