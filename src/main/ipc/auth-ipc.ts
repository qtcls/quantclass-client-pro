/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { tokenStore } from "@/main/lib/tokenStore.js"
import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import { ipcMain } from "electron"

// -- 渲染端登录成功后把 access/refresh token 交给主进程统一管理
function setTokensHandler(): void {
	ipcMain.on(
		IPC_CHANNELS.AUTH_SET_TOKENS,
		async (_event, tokens: { access_token: string; refresh_token: string }) => {
			await tokenStore.setTokens(tokens)
		},
	)
}

// -- 渲染端发请求前获取 access_token
function getAccessTokenHandler(): void {
	ipcMain.handle(IPC_CHANNELS.AUTH_GET_ACCESS_TOKEN, async () => {
		return await tokenStore.getAccessToken()
	})
}

// -- 渲染端 401 时强制刷新一次 access_token
function forceRefreshHandler(): void {
	ipcMain.handle(IPC_CHANNELS.AUTH_FORCE_REFRESH, async () => {
		return await tokenStore.getAccessToken({ force: true })
	})
}

// -- 渲染端登出 IPC
function logoutHandler(): void {
	ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async () => {
		await tokenStore.logout()
	})
}

export const regAuthIPC = () => {
	setTokensHandler()
	getAccessTokenHandler()
	forceRefreshHandler()
	logoutHandler()
	console.log("[reg] auth-ipc")
}
