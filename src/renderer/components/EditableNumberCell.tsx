/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { Input } from "@/renderer/components/ui/input"
import { totalWeightAtom } from "@/renderer/store/storage"
import { useUnmount } from "etc-hooks"
import { useAtom } from "jotai"
import { useEffect, useRef, useState } from "react"
import type { ChangeEvent, FC, KeyboardEvent } from "react"
import { toast } from "sonner"

interface EditableNumberCellProps {
	value: number
	disabled?: boolean
	onChange: (value: number) => void
	className?: string
}

const { setStoreValue } = window.electronAPI

const EditableNumberCell: FC<EditableNumberCellProps> = ({
	value,
	onChange,
	className,
	disabled,
}) => {
	const inputRef = useRef<HTMLInputElement>(null)
	const [totalWeight, setTotalWeight] = useAtom(totalWeightAtom)
	const [inputValue, setInputValue] = useState(value?.toString() || "0")

	useEffect(() => {
		if (value !== undefined) {
			setInputValue(value.toString())
		}
	}, [value])

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value
		setInputValue(newValue)
	}

	const handleBlur = () => {
		updateValue()
	}

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			inputRef.current?.blur()
		}
	}

	const updateValue = () => {
		let newValue = Number.parseFloat(Number.parseFloat(inputValue).toFixed(5))
		if (Number.isNaN(newValue) || newValue < 0) {
			toast.dismiss()
			toast.warning("资金占比输入错误，已自动调整为 0%")
			newValue = 0
			// setInputValue("0")
			// onChange(0)
			// setTotalWeight((prevTotal) => prevTotal - value + 1)
			// return
		}

		if (newValue !== value) {
			const adjustedValue = Math.min(100, newValue)
			const diff = Number((adjustedValue - value).toFixed(5))
			if (Number((totalWeight + diff).toFixed(5)) <= 100) {
				onChange(adjustedValue)
				setTotalWeight((prevTotal) => Number((prevTotal + diff).toFixed(5)))
			} else {
				const maxAllowedValue = Number(
					Math.max(0, value + (100 - totalWeight)).toFixed(5),
				)
				onChange(maxAllowedValue)
				setInputValue(maxAllowedValue.toString())
				setTotalWeight(100)
				toast.dismiss()
				toast.info("资金占比超过 100%，已自动调整为最大可能值")
				return
			}
			toast.success(`设置为 ${adjustedValue}%`)
		}
	}

	useUnmount(() => {
		setStoreValue("totalWeight", totalWeight)
	})

	return (
		<div className="flex items-center">
			<Input
				ref={inputRef}
				type="number"
				step={1}
				min={0}
				max={100}
				value={inputValue}
				readOnly={disabled}
				onFocus={(e) => {
					if (disabled) {
						e.target.blur()
						toast.dismiss()
						toast.warning("请先关闭自动实盘，再调整权重")
						return
					}
				}}
				onChange={handleChange}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
				className={`h-[unset] w-[15px] mr-1 ${className}`}
			/>
			%
		</div>
	)
}

export default EditableNumberCell
