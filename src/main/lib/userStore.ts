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
import { ApiError, post } from "../utils/request.js"
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
			return await this.updateUserInfo()
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
	async updateUserInfo(): Promise<UserAccount | null> {
		try {
			logger.info("[user] 发起用户信息更新请求")
			const data = await post<UserAccountInfo>("/user/info/v3", {})

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

				return this._buildUserAccount(WebUserInfo)
			}

			logger.error("[user] 获取用户信息失败: 响应数据格式错误")
			return null
		} catch (error) {
			if (error instanceof ApiError) {
				logger.error(
					`[user] 获取用户信息失败 ${JSON.stringify(
						{ status: error.status, error: error.data },
						null,
						2,
					)}`,
				)
				return null
			}
			logger.error(
				`[user] 更新用户信息时发生异常: ${JSON.stringify(error, null, 2)}`,
			)
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
