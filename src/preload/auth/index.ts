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
import { ipcRenderer } from "electron"

export const authIPC = {
	// -- 渲染端登录成功后把 access/refresh token 交给主进程统一管理
	setTokens: (tokens: { access_token: string; refresh_token: string }) =>
		ipcRenderer.send(IPC_CHANNELS.AUTH_SET_TOKENS, tokens),

	// -- 渲染端请求前获取 access_token
	getAccessToken: (): Promise<string | null> =>
		ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_ACCESS_TOKEN),

	// -- 渲染端 401 时强制刷新一次 access_token
	forceRefreshAccessToken: (): Promise<string | null> =>
		ipcRenderer.invoke(IPC_CHANNELS.AUTH_FORCE_REFRESH),

	// -- 渲染端登出 IPC
	logoutAuth: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT),

	// -- 渲染端订阅主进程推送的会话失效事件
	onSessionInvalid: (cb: () => void): (() => void) => {
		const listener = () => cb()
		ipcRenderer.on(IPC_CHANNELS.AUTH_SESSION_INVALID, listener)
		return () => {
			ipcRenderer.removeListener(IPC_CHANNELS.AUTH_SESSION_INVALID, listener)
		}
	},
}
