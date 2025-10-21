/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { UserAccount, WebUserInfo } from "@/shared/types/user.js"
import { ipcRenderer } from "electron"

export const userIPC = {
	/**
	 * 同步用户状态到主进程
	 */
	syncWebUserInfo: (WebUserInfo: WebUserInfo) =>
		ipcRenderer.send("sync-user-state", WebUserInfo),

	/**
	 * 获取当前的用户账号信息（带缓存逻辑）
	 * @param isForce 是否强制更新，忽略缓存
	 */
	getUserAccount: (isForce = false): Promise<UserAccount | null> =>
		ipcRenderer.invoke("get-user-account", isForce),

	/**
	 * 更新用户信息
	 */
	updateUserInfo: (): Promise<UserAccount | null> =>
		ipcRenderer.invoke("update-user-info"),

	/**
	 * 清除用户状态
	 */
	clearWebUserInfo: () => ipcRenderer.send("clear-user-state"),
}
