/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type {
	UserAccount,
	UserAccountInfo,
	WebUserInfo,
} from "@/shared/types/user.js"
import Store from "electron-store"
import { calculatePermissions } from "../utils/user.js"
import logger from "../utils/wiston.js"

export type { UserAccount, WebUserInfo } from "@/shared/types/user.js"

interface WebUserInfoWithTimestamp {
	WebUserInfo: WebUserInfo
	lastUpdateTime: number
	last_login_time: number
}

class UserStore {
	public _userStore = new Store({ name: "user" })

	// -- 写入用户 Web 信息 + 上次登录时间到 userData
	setWebUserInfo(_WebUserInfo: WebUserInfo): void {
		const data = this._userStore.get("userData") as
			| WebUserInfoWithTimestamp
			| undefined
		this._userStore.set("userData", {
			...data,
			WebUserInfo: _WebUserInfo,
			lastUpdateTime: Date.now(),
			last_login_time: Date.now(),
		})
	}

	// -- 获取用户信息（带缓存逻辑）
	async getUserAccount(isForce = false): Promise<UserAccount | null> {
		const BASE_TIME = 15 * 3600 * 1000 // 15小时的毫秒数
		// 15小时 + 0~4小时的随机偏移
		const randomOffset = Math.random() * 4 * 3600 * 1000
		const cacheExpireTime = BASE_TIME + randomOffset

		const data = this._userStore.get("userData") as
			| WebUserInfoWithTimestamp
			| undefined

		// 如果没有数据，主动请求更新
		if (!data?.WebUserInfo) {
			const result = await this.updateUserInfo()

			return result === "AUTH_FAILED" ? null : result
		}

		const now = Date.now()
		const lastUpdateTime = data.lastUpdateTime

		// 如果距离上次更新未超过缓存过期时间且不强制更新，返回缓存数据
		if (lastUpdateTime && now - lastUpdateTime < cacheExpireTime && !isForce) {
			logger.info("[user] 使用缓存的用户信息（未超过缓存过期时间）")
			return this._buildUserAccount(data.WebUserInfo)
		}

		logger.info("[user] 缓存已过期或强制更新，发起新的用户信息请求")
		const updatedUserAccount = await this.updateUserInfo()

		if (updatedUserAccount === "AUTH_FAILED") {
			// 认证失败，返回null触发重新登录
			return null
		}

		if (updatedUserAccount) {
			return updatedUserAccount
		}

		// 网络错误等，返回旧数据
		return this._buildUserAccount(data.WebUserInfo)
	}

	// -- 构建用户账户对象
	private _buildUserAccount(WebUserInfo: WebUserInfo): UserAccount {
		const permissions = calculatePermissions(WebUserInfo.user)
		const user = WebUserInfo.user

		return {
			user: {
				id: user?.id ?? "",
				uuid: user?.uuid ?? "",
				apiKey: user?.apiKey ?? "",
				headimgurl: user?.headimgurl ?? "",
				isMember: user?.isMember ?? false,
				groupInfo: user?.groupInfo ?? [],
				nickname: user?.nickname ?? "",
				membershipInfo: user?.membershipInfo ?? [],
				approval: user?.approval ?? {
					block: false,
					crypto: false,
					stock: false,
				},
			},
			isLoggedIn: WebUserInfo.isLoggedIn,
			...permissions,
		}
	}

	// -- 更新用户信息
	async updateUserInfo(): Promise<UserAccount | null | "AUTH_FAILED"> {
		const store = new Store()
		const apiKey = (await store.get("settings.api_key", "")) as string
		const hid = (await store.get("settings.hid", "")) as string

		try {
			logger.info("[user] 发起用户信息更新请求")
			const BASE_URL = process.env.VITE_BASE_URL || "https://api.quantclass.cn"

			const response = await fetch(`${BASE_URL}/user/info/v3?uuid=${hid}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"api-key": apiKey,
				},
				body: JSON.stringify({}),
			})

			if (!response.ok) {
				logger.error(
					`[user] 获取用户信息失败: ${response.status} ${response.statusText}`,
				)

				// 如果是403无权限，清空用户状态，返回AUTH_FAILED
				if (response.status === 403) {
					logger.error("[user] 凭证已过期或无效，清空用户状态")
					await this.clearWebUserInfo()
					return "AUTH_FAILED"
				}

				// 其他错误返回null
				return null
			}

			const data = (await response.json()) as UserAccountInfo

			if (data) {
				const WebUserInfo: WebUserInfo = {
					user: data,
					isLoggedIn: true,
				}

				// 保存用户信息到主进程文件（仅更新用户信息和 lastUpdateTime，不更新 last_login_time）
				const existing = this._userStore.get("userData") as
					| WebUserInfoWithTimestamp
					| undefined
				this._userStore.set("userData", {
					...existing,
					WebUserInfo,
					lastUpdateTime: Date.now(),
				})
				logger.info("[user] 用户信息已更新并保存")

				// 返回构建的用户账户对象
				return this._buildUserAccount(WebUserInfo)
			}

			logger.error("[user] 获取用户信息失败: 响应数据格式错误")
			return null
		} catch (error) {
			logger.error(`[user] 更新用户信息时发生错误: ${error}`)
			// 网络错误等，返回null
			return null
		}
	}

	// -- 获取上次扫码登录时间 last_login_time
	getLastLoginTime(): number {
		const data = this._userStore.get("userData") as
			| WebUserInfoWithTimestamp
			| undefined
		return (data?.last_login_time ?? 0) || 0
	}

	// -- 清除用户信息 userData
	async clearWebUserInfo() {
		this._userStore.delete("userData")
	}
}

// -- 导出单例
export const userStore = new UserStore()
