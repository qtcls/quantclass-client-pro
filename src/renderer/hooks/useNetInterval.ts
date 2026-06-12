/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { isUpdatingAtom } from "@/renderer/store"
import { useAtomValue } from "jotai"
import { useEffect, useRef } from "react"
import { toast } from "sonner"

export const useNetInterval = () => {
	const isUpdating = useAtomValue(isUpdatingAtom)
	const isUpdatingRef = useRef(isUpdating) // 定义一个引用

	useEffect(() => {
		isUpdatingRef.current = isUpdating // 在每一次渲染后更新引用的值
	}, [isUpdating])

	useEffect(() => {
		const unsubscribe = window.electronAPI.subscribeScheduleStatus(
			(__e, status) => {
				if (status === "outline") {
					toast.dismiss()
					toast.warning("网络连接已断开", { duration: 8 * 1000 })
				}
			},
		)

		return unsubscribe
	}, [])
}
