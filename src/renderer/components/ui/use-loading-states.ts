/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { LoadingState } from "@/renderer/components/ui/multi-step-loader"
import type { IDataListType } from "@/renderer/schemas/data-schema"
import { stepAtom } from "@/renderer/store"
import { useSetAtom } from "jotai"
import { toast } from "sonner"

const { openUrl, openDataDirectory, createTerminalWindow, minimizeApp } =
	window.electronAPI

const { VITE_BASE_URL } = import.meta.env

export const useLoadingStates = (
	task: IDataListType,
	{
		stepOneLoading,
		stepTwoLoading,
		stepThreeLoading,
	}: {
		stepOneLoading: boolean
		stepTwoLoading: boolean
		stepThreeLoading: boolean
	},
	setL: React.Dispatch<React.SetStateAction<boolean>>,
	fullRunAsync: (name: string) => Promise<{
		status: string
		message: string
	}>,
	refresh: () => void,
): LoadingState[] => {
	const setStep = useSetAtom(stepAtom)

	return [
		{
			actionText: "获取",
			text: "获取全量下载链接",
			loading: stepOneLoading,
			action: async () => {
				if (task.fullData !== undefined) {
					openUrl(`${VITE_BASE_URL}/api/product/data-route/${task.fullData}`)

					return
				}
				let url = `${VITE_BASE_URL}/api/product/data-route/${task.name}`

				if (url.endsWith("-daily")) {
					url = url.replace("-daily", "")
				}

				openUrl(url)
				// setStep((p) => p + 1)
			},
		},
		{
			actionText: "打开",
			text: "下载全量数据到本地",
			loading: stepTwoLoading,
			action: async () => {
				await openDataDirectory("zip")
			},
		},
		{
			actionText: "导入",
			text: "导入全量数据",
			loading: stepThreeLoading,
			action: async () => {
				createTerminalWindow()

				const res = await fullRunAsync(task.name)

				if (res.status === "success") {
					toast.success("全量更新成功")
					// setStep((p) => p + 1)
					minimizeApp("terminal")

					return
				}

				toast.error("全量更新失败")
				// setStep((p) => p + 1)
				minimizeApp("terminal")
			},
		},
		{
			text: "完成",
			actionText: "关闭",
			action: async () => {
				setStep(0)
				setL(false)
				refresh()
			},
		},
	]
}
