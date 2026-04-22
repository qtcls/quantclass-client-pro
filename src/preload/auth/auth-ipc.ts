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
import { ipcMain } from "electron"

// -- 渲染端登录成功后把 access/refresh token 交给主进程统一管理
function setTokensHandler(): void {
	ipcMain.on(
		"auth:set-tokens",
		async (_event, tokens: { access_token: string; refresh_token: string }) => {
			await tokenStore.setTokens(tokens)
		},
	)
}

// -- 渲染端发请求前获取 access_token
function getAccessTokenHandler(): void {
	ipcMain.handle("auth:get-access-token", async () => {
		return await tokenStore.getAccessToken()
	})
}

// -- 渲染端 401 时强制刷新一次 access_token
function forceRefreshHandler(): void {
	ipcMain.handle("auth:force-refresh", async () => {
		return await tokenStore.getAccessToken({ force: true })
	})
}

// -- 渲染端登出 IPC
function logoutHandler(): void {
	ipcMain.handle("auth:logout", async () => {
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
