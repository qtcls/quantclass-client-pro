/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { usePermissionCheck } from "@/renderer/hooks"
import { useToggleAutoRealTrading } from "@/renderer/hooks/useToggleAutoRealTrading"
import { isUpdatingAtom } from "@/renderer/store"
import { accountKeyAtom } from "@/renderer/store/storage"
import { userAtom } from "@/renderer/store/user"
import { useAtomValue, useSetAtom } from "jotai"
import { toast } from "sonner"

// -- 定义消息类型接口
export interface ToastMessage {
	pauseInfo: string
	successInfo: string
}

const DEFAULT_MESSAGES: ToastMessage = {
	pauseInfo: "数据更新已暂停",
	successInfo: "数据更新已启动",
}

const { toggleHandler } = window.electronAPI

export const useHandleTimeTask = () => {
	const { isMember } = useAtomValue(userAtom)
	const { uuid, apiKey } = useAtomValue(accountKeyAtom)
	const setIsUpdating = useSetAtom(isUpdatingAtom)
	const { isAutoRocket, handleToggleAutoRocket } = useToggleAutoRealTrading()
	const { check } = usePermissionCheck()

	return async (
		isPause: boolean,
		showToast = true,
		messages: Partial<ToastMessage> = {},
	) => {
		if (!check().isValid) return false

		// if (role === 0) {
		if (!isMember) {
			toast.dismiss()
			toast.warning("该功能为课程同学专属使用")
			return false
		}

		if (!uuid || !apiKey) {
			toast.dismiss()
			toast.warning("账户信息异常，请重新登录")
			return false
		}

		const { pauseInfo, successInfo } = { ...DEFAULT_MESSAGES, ...messages }

		try {
			toggleHandler(!isPause)
			setIsUpdating(!isPause)
			toast.dismiss()

			if (showToast) {
				if (isPause) {
					toast.info(pauseInfo, {
						description: "自动更新会在本次更新结束后停止",
					})
					isAutoRocket && handleToggleAutoRocket(false)
				} else {
					toast.success(successInfo)
				}
			}

			return true
		} catch (error) {
			toast.dismiss()
			toast.error("操作失败，请重试")
			return false
		}
	}
}
