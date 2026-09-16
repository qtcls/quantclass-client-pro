/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { zhCN } from "date-fns/locale"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"

dayjs.extend(utc)

import { Button } from "@/renderer/components/ui/button"
import { Calendar } from "@/renderer/components/ui/calendar"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/renderer/components/ui/popover"
import { cn } from "@/renderer/lib/utils"
import { CalendarIcon } from "lucide-react"
import { useMemo } from "react"
import * as React from "react"

interface DatePickerProps {
	value?: Date
	onChange?: (date: Date | undefined) => void
	name?: string
	className?: string
	disableFutureDates?: boolean // -- 新增属性，用于控制是否禁用未来日期
	disabledDate?: (date: Date) => boolean // -- 自定义禁用日期函数，优先级高于 disableFutureDates
	disabled?: boolean
}

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
	(
		{
			value,
			onChange,
			className,
			disableFutureDates = false, // -- 默认为 false，不禁用未来日期
			disabledDate,
			disabled = false,
		},
		ref,
	) => {
		// -- 确保输入的值是正确的 Date 对象
		const dateValue = useMemo(() => {
			if (!value) return undefined
			const date = dayjs(value)
			return date.isValid() ? date.toDate() : undefined
		}, [value])

		// -- 格式化显示的日期
		const formattedDate = useMemo(() => {
			if (!dateValue) return "今天"
			return dayjs(dateValue).format("YYYY年MM月DD日")
		}, [dateValue])

		return (
			<Popover>
				<PopoverTrigger asChild>
					<Button
						ref={ref}
						variant={"outline"}
						disabled={disabled}
						className={cn(
							"w-[240px] justify-start text-left font-normal",
							!dateValue && "text-muted-foreground",
							className,
						)}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{formattedDate || <span>选择日期</span>}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start" side="bottom">
					<Calendar
						mode="single"
						selected={dateValue}
						onSelect={(date) => {
							if (date) {
								// -- 转换为 UTC 时间并返回 Date 对象
								const utcDate = dayjs(date).utc().toDate()
								onChange?.(utcDate)
							} else {
								// onChange?.(undefined)
							}
						}}
						autoFocus
						locale={zhCN}
					disabled={
							disabledDate
								? disabledDate
								: disableFutureDates
									? (date) => date > new Date()
									: undefined
						}
						defaultMonth={
							new Date(
								dateValue?.getFullYear() || new Date().getFullYear(),
								dateValue?.getMonth() || new Date().getMonth(),
							)
						}
						initialFocus
					/>
				</PopoverContent>
			</Popover>
		)
	},
)

DatePicker.displayName = "DatePicker"

export default DatePicker
