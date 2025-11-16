/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { UserAccount, UserInfo, WebUserInfo } from "@/shared/types/user.js"
import Store from "electron-store"
import { calculatePermissions } from "../utils/user.js"
import logger from "../utils/wiston.js"

export type { UserAccount, WebUserInfo } from "@/shared/types/user.js"

interface WebUserInfoWithTimestamp {
	WebUserInfo: WebUserInfo
	lastUpdateTime: number
}

class UserStore {
	public _userStore = new Store({ name: "user" })

	// -- 存储用户Web信息
	async setWebUserInfo(_WebUserInfo: WebUserInfo) {
		const dataWithTimestamp: WebUserInfoWithTimestamp = {
			WebUserInfo: _WebUserInfo,
			lastUpdateTime: Date.now(),
		}
		this._userStore.set("userData", dataWithTimestamp)
	}

	// -- 获取用户信息（带缓存逻辑）
	async getUserAccount(isForce = false): Promise<UserAccount | null> {
		const TWO_HOURS = 2 * 60 * 60 * 1000 // 两小时的毫秒数
		// 两小时±10分钟
		const randomOffset = (Math.random() - 0.5) * 2 * 10 * 60 * 1000
		const cacheExpireTime = TWO_HOURS + randomOffset

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

		// 如果距离上次更新不足两小时且不强制更新，返回缓存数据
		if (lastUpdateTime && now - lastUpdateTime < cacheExpireTime && !isForce) {
			logger.info("[user] 使用缓存的用户信息（未超过两小时）")
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

			const data = (await response.json()) as UserInfo

			if (data) {
				const WebUserInfo: WebUserInfo = {
					user: data,
					isLoggedIn: true,
				}

				// 保存全部用户信息到主进程文件
				await this.setWebUserInfo(WebUserInfo)
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

	// -- 获取上次更新时间
	async getLastUpdateTime(): Promise<number | null> {
		const data = this._userStore.get("userData") as
			| WebUserInfoWithTimestamp
			| undefined
		return data?.lastUpdateTime ?? null
	}

	// -- 清除用户信息
	async clearWebUserInfo() {
		this._userStore.delete("userData")
	}
}

// -- 导出单例
export const userStore = new UserStore()
