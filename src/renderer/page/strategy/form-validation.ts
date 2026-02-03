/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { SelectStgFormData } from "@/renderer/page/strategy/types"
import { isNumber } from "lodash-es"
import type { UseFormReturn } from "react-hook-form"
import { toast } from "sonner"

export const useFormValidation = (_form: UseFormReturn<SelectStgFormData>) => {
	// -- 验证表单数据并返回验证结果
	const validateFormData = async (data: SelectStgFormData) => {
		/**
		 * 拆单金额必须为大于 0 的数字
		 */
		const splitOrderAmount = Number(data.split_order_amount)

		if (!isNumber(splitOrderAmount) || splitOrderAmount <= 0) {
			toast.error("拆单金额必须为大于 0 的数字")
			return false
		}

		return true
	}

	return {
		validateFormData,
	}
}
