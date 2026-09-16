/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { getExtraWorkStatus } from "@/renderer/request"
import { useMutation } from "@tanstack/react-query"

const { rendererLog } = window.electronAPI

// -- 获取是否完成过小组作业
export const useExtraWorkStatus = () => {
	const { mutateAsync } = useMutation({
		mutationKey: ["extra-work-status"],
		mutationFn: () => getExtraWorkStatus(),
		onError: (error) => {
			rendererLog(
				"error",
				`获取额外工作状态失败: ${JSON.stringify(error, null, 2)}`,
			)
		},
	})

	return { mutateAsync }
}
