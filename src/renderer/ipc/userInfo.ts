/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { _ipcRenderer } from "@/renderer/constant"
import type { UserState } from "@/renderer/types"

// 同步用户状态到主进程
export const syncUserState = async (userState: Omit<UserState, "token">) => {
	try {
		await _ipcRenderer.send("sync-user-state", userState)
	} catch (error) {
		console.error("Failed to sync user state:", error)
		throw new Error("Failed to sync user state")
	}
}

// 获取当前的用户状态
export const getUserState = async (): Promise<UserState | null> => {
	try {
		return await _ipcRenderer.invoke("get-user-state")
	} catch (error) {
		console.error("Failed to get user state:", error)
		return null
	}
}

// 清除用户状态
export const clearUserState = async () => {
	try {
		await _ipcRenderer.send("clear-user-state")
	} catch (error) {
		console.error("Failed to clear user state:", error)
		throw new Error("Failed to clear user state")
	}
}
