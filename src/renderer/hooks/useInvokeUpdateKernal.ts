/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { KernalType } from "@/shared/types"
import { toast } from "sonner"
import { useLocalVersions } from "../store/versions"

/**
 * 更新内核，虽然只是简单的调用了IPC，但是针对提示和重试做了一些处理
 * @returns 更新内核
 * @param kernal 内核类型
 * @param targetVersion 目标版本
 */
export const useInvokeUpdateKernal = () => {
	const { updateKernal } = window.electronAPI
	const { refetchLocalVersions } = useLocalVersions()
	return async (
		kernal: KernalType,
		targetVersion?: string,
	): Promise<boolean> => {
		const toastId = toast.loading(
			`更新 ${kernal} 内核到版本 ${targetVersion || "最新版本"}...`,
		)
		console.log(`Updating ${kernal} to version ${targetVersion}`)

		let success = false
		try {
			const res = await updateKernal(kernal, targetVersion)
			success = res.success
			if (res.success) {
				toast.success(`${kernal} 内核更新成功`, { id: toastId })
			} else {
				toast.warning(`${kernal} 内核更新异常`, {
					id: toastId,
					description: res.error,
				})
			}
		} catch {
			toast.error(`${kernal} 内核更新失败`, { id: toastId })
		} finally {
			await refetchLocalVersions() // -- 更新后重新请求本地版本
		}
		// -- 如实返回单内核更新结果（INV8：失败返回 false，供调用方聚合）
		return success
	}
}
