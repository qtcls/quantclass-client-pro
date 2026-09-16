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
import { whiteListQueryAtom } from "@/renderer/store/whitelist"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect } from "react"
// import { onPythonOutPut, unPythonOutPutListener } from "../ipc/listener"

const { sendUpdateStatus } = window.electronAPI

export const useGlobalValue = () => {
	const setIsUpdating = useSetAtom(isUpdatingAtom)
	// const setPythonOutput = useSetAtom(fuelOutPutAtom)

	useAtomValue(whiteListQueryAtom)

	useEffect(() => {
		// 移除监听, 防止重复监听
		// unPythonOutPutListener()

		// const handler = (output: string) => {
		// 	setPythonOutput((currentOutput) => {
		// 		// 拼接当前输出和新数据
		// 		const updatedOutput = `${currentOutput}<br/>${output}`
		// 		// 计算需要截取的起始位置
		// 		const start = Math.max(0, updatedOutput.length - 50000)

		// 		// 返回截取的字符串
		// 		return updatedOutput.substring(start)
		// 	})
		// }

		const handlerUpdateStatus = (_event: any, data: boolean) => {
			setIsUpdating(data)
		}

		sendUpdateStatus(handlerUpdateStatus)

		// onPythonOutPut(handler)

		// return () => {
		// 	unPythonOutPutListener()
		// }
	}, [])
}
