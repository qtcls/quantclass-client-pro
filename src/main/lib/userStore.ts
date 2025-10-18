/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { UserInfo, UserState } from "@/shared/types/user.js"
import Store from "electron-store"
import logger from "../utils/wiston.js"

export type { UserState } from "@/shared/types/user.js"

interface UserStateWithTimestamp {
	userState: UserState
	lastUpdateTime: number
}

class UserStore {
	public _userStore = new Store({ name: "user" })

	// -- 设置用户信息，过滤掉不需要的字段
	async setUserState(_userState: UserState) {
		const dataWithTimestamp: UserStateWithTimestamp = {
			userState: _userState,
			lastUpdateTime: Date.now(),
		}
		this._userStore.set("userData", dataWithTimestamp)
	}

	// -- 获取用户信息
	async getUserState(): Promise<UserState | null> {
		const data = this._userStore.get("userData") as
			| UserStateWithTimestamp
			| undefined
		return data?.userState ?? null
	}

	// -- 更新用户信息
	async updateUserInfo(token: string, isForce = false) {
		const TWO_HOURS = 2 * 60 * 60 * 1000 // 两小时的毫秒数
		const lastUpdateTime = await userStore.getLastUpdateTime()
		const now = Date.now()

		// 如果距离上次更新不足两小时，返回旧数据
		if (lastUpdateTime && now - lastUpdateTime < TWO_HOURS && !isForce) {
			logger.info("[user] 使用缓存的用户信息（未超过两小时）")
			return await userStore.getUserState()
		}

		// 超过两小时或没有缓存，发起新请求
		try {
			logger.info("[user] 发起新的用户信息请求")
			const BASE_URL = process.env.VITE_BASE_URL || "https://api.quantclass.cn"

			const response = await fetch(`${BASE_URL}/user/info`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: token,
				},
				body: JSON.stringify({}),
			})

			if (!response.ok) {
				logger.error(
					`[user] 获取用户信息失败: ${response.status} ${response.statusText}`,
				)

				// 如果是401无权限，说明token过期，清空用户状态，返回null
				if (response.status === 401) {
					logger.error("[user] Token已过期，清空用户状态")
					await userStore.clearUserState()
					return null
				}

				// 其他错误，返回旧数据
				return await userStore.getUserState()
			}

			const data = (await response.json()) as UserInfo

			if (data) {
				const userState = {
					token,
					user: data,
					isLoggedIn: true,
				}

				// 保存到主进程
				await userStore.setUserState(userState)
				logger.info("[user] 用户信息已更新并保存")

				return userState
			}

			logger.error("[user] 获取用户信息失败: 响应数据格式错误")
			return await userStore.getUserState()
		} catch (error) {
			logger.error(`[user] 更新用户信息时发生错误: ${error}`)
			// 发生错误时返回旧数据
			return await userStore.getUserState()
		}
	}

	// -- 获取上次更新时间
	async getLastUpdateTime(): Promise<number | null> {
		const data = this._userStore.get("userData") as
			| UserStateWithTimestamp
			| undefined
		return data?.lastUpdateTime ?? null
	}

	// -- 清除用户信息
	async clearUserState() {
		this._userStore.delete("userData")
	}
}

// -- 导出单例
export const userStore = new UserStore()
