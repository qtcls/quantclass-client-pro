/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { userStore } from "@/main/lib/userStore.js"
import logger from "@/main/utils/wiston.js"
import type { WebUserInfo } from "@/shared/types/user.js"
import { ipcMain } from "electron"

/**
 * 同步用户状态到主进程
 */
async function syncWebUserInfoHandler(): Promise<void> {
	ipcMain.on("sync-user-state", async (_event, WebUserInfo: WebUserInfo) => {
		logger.info("[user] 信息已同步")
		await userStore.setWebUserInfo(WebUserInfo)
	})
}

/**
 * 获取当前的用户账号信息（带缓存逻辑）
 */
async function getUserAccountHandler(): Promise<void> {
	ipcMain.handle("get-user-account", async (_event, isForce = false) => {
		return await userStore.getUserAccount(isForce)
	})
}

/**
 * 清除用户状态
 */
async function clearWebUserInfoHandler(): Promise<void> {
	ipcMain.on("clear-user-state", async () => {
		logger.info("[user] 信息已清除")
		await userStore.clearWebUserInfo()
	})
}

/**
 * 更新用户信息
 */
async function updateUserInfoHandler(): Promise<void> {
	ipcMain.handle("update-user-info", async () => {
		return await userStore.updateUserInfo()
	})
}

/**
 * 注册所有用户相关的 IPC handlers
 */
export const regUserIPC = () => {
	syncWebUserInfoHandler()
	getUserAccountHandler()
	clearWebUserInfoHandler()
	updateUserInfoHandler()
	console.log("[reg] user-ipc")
}
