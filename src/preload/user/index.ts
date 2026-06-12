/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import type { UserAccount, WebUserInfo } from "@/shared/types/user.js"
import { ipcRenderer } from "electron"

export const userIPC = {
	/**
	 * 同步用户状态到主进程
	 */
	syncWebUserInfo: (WebUserInfo: WebUserInfo) =>
		ipcRenderer.send(IPC_CHANNELS.SYNC_USER_STATE, WebUserInfo),

	/**
	 * 获取当前的用户账号信息（带缓存逻辑）
	 * @param isForce 是否强制更新，忽略缓存
	 */
	getUserAccount: (isForce = false): Promise<UserAccount | null> =>
		ipcRenderer.invoke(IPC_CHANNELS.GET_USER_ACCOUNT, isForce),

	/**
	 * 清除用户状态
	 */
	clearWebUserInfo: () => ipcRenderer.send(IPC_CHANNELS.CLEAR_USER_STATE),
}
