/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import fs from "node:fs/promises"
import path from "node:path"
import logger from "@/main/utils/wiston.js"
import { BASE_URL } from "@/main/vars.js"
import type {
	AccessTokenJwtPayload,
	AccessTokenStorage,
	AuthRefreshResponse,
} from "@/shared/types/auth.js"
import { BrowserWindow, app, safeStorage } from "electron"
import { jwtDecode } from "jwt-decode"

const REFRESH_TOKEN_FILE = "refresh-token.enc"

// -- 临近过期阈值
const NEAR_EXPIRE_MS = 20 * 60 * 1000

const decodeJwtExp = (token: string): number | null => {
	try {
		const payload = jwtDecode<AccessTokenJwtPayload>(token)
		return typeof payload.exp === "number" ? payload.exp : null
	} catch {
		return null
	}
}

const resolveFilePath = (): string =>
	path.join(app.getPath("userData"), REFRESH_TOKEN_FILE)

export const broadcastAuthSessionInvalid = (): void => {
	for (const win of BrowserWindow.getAllWindows()) {
		if (!win.isDestroyed()) {
			win.webContents.send("auth:session-invalid")
		}
	}
}

class TokenStore {
	private accessToken: AccessTokenStorage | null = null
	private refreshToken: string | null = null
	// -- refresh 并发去重
	private refreshPromise: Promise<string | null> | null = null

	// -- 启动时从磁盘解密 refresh_token 到内存
	async init(): Promise<void> {
		try {
			if (!safeStorage.isEncryptionAvailable()) return
			const filePath = resolveFilePath()
			const buf = await fs.readFile(filePath).catch(() => null)
			if (!buf) return
			const decrypted = safeStorage.decryptString(buf)
			if (decrypted) this.refreshToken = decrypted
		} catch (error) {
			logger.error(
				`[tokenStore] init 解密 refresh_token 失败: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	// -- 登录成功后同步两个 token；refresh 加密写盘，access 存内存
	async setTokens(tokens: {
		access_token: string
		refresh_token: string
	}): Promise<void> {
		this.accessToken = {
			access_token: tokens.access_token,
			exp: decodeJwtExp(tokens.access_token),
		}
		this.refreshToken = tokens.refresh_token
		await this.persistRefreshToken(tokens.refresh_token)
	}

	// -- 清除内存与磁盘
	async clear(): Promise<void> {
		this.accessToken = null
		this.refreshToken = null
		try {
			await fs.unlink(resolveFilePath())
		} catch (error) {
			logger.warn(
				`[tokenStore] clear: 删除 refresh-token 文件失败: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	// -- 内存中是否同时存在 access_token 与 refresh_token
	hasBothTokensInMemory(): boolean {
		const access = this.accessToken?.access_token
		return Boolean(access && this.refreshToken)
	}

	/**
	 * 获取 access_token
	 * - force：强制 await refresh
	 * - 缺失或已过期：await refresh
	 * - 临近过期（<20min）且未过期：立即返回当前 token，并触发异步 refresh
	 * - 其它：直接返回当前 token
	 */
	async getAccessToken(
		options: { force?: boolean } = {},
	): Promise<string | null> {
		if (options.force) return this.refreshAccessToken()

		const current = this.accessToken
		const nowSec = Math.floor(Date.now() / 1000)
		const expSec = current?.exp ?? null

		if (!current || (expSec !== null && expSec <= nowSec)) {
			return this.refreshAccessToken()
		}

		if (expSec !== null && expSec * 1000 - Date.now() < NEAR_EXPIRE_MS) {
			void this.refreshAccessToken()
		}

		return current.access_token
	}

	refreshAccessToken(): Promise<string | null> {
		if (this.refreshPromise) return this.refreshPromise

		this.refreshPromise = (async () => {
			let newAccess: string | null = null
			try {
				const refreshToken = this.refreshToken
				if (!refreshToken) {
					logger.error("[tokenStore] 无 refresh_token，无法刷新")
					broadcastAuthSessionInvalid()
					return null
				}

				const res = await fetch(`${BASE_URL}/user/auth/refresh`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${refreshToken}`,
						"Content-Type": "application/json",
					},
				})

				if (!res.ok) {
					logger.error(
						`[tokenStore] 刷新 access_token 失败: HTTP ${res.status} ${res.statusText}`,
					)
					broadcastAuthSessionInvalid()
					return null
				}

				const data = (await res.json()) as AuthRefreshResponse
				if (
					!data?.success ||
					typeof data.access_token !== "string" ||
					!data.access_token
				) {
					logger.error("[tokenStore] 刷新 access_token 失败：响应无效")
					broadcastAuthSessionInvalid()
					return null
				}

				this.accessToken = {
					access_token: data.access_token,
					exp: decodeJwtExp(data.access_token),
				}
				newAccess = data.access_token

				if (
					typeof data.refresh_token === "string" &&
					data.refresh_token &&
					data.refresh_token !== this.refreshToken
				) {
					this.refreshToken = data.refresh_token
					await this.persistRefreshToken(data.refresh_token)
				}
			} catch (error) {
				logger.error(
					`[tokenStore] 刷新 access_token 异常: ${error instanceof Error ? error.message : String(error)}`,
				)
				broadcastAuthSessionInvalid()
			} finally {
				this.refreshPromise = null
			}
			return newAccess
		})()

		return this.refreshPromise
	}

	// -- 调后端 logout，再清理本地
	async logout(): Promise<void> {
		const refreshToken = this.refreshToken
		if (refreshToken) {
			try {
				await fetch(`${BASE_URL}/user/auth/logout`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${refreshToken}`,
						"Content-Type": "application/json",
					},
				})
			} catch (error) {
				logger.error(
					`[tokenStore] 退出登录失败: ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}
		await this.clear()
	}

	private async persistRefreshToken(token: string): Promise<void> {
		try {
			if (!safeStorage.isEncryptionAvailable()) {
				logger.warn("[tokenStore] safeStorage 不可用，跳过写盘")
				return
			}
			const encrypted = safeStorage.encryptString(token)
			await fs.writeFile(resolveFilePath(), encrypted)
		} catch (error) {
			logger.error(
				`[tokenStore] 写入 refresh_token 失败: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}
}

export const tokenStore = new TokenStore()
