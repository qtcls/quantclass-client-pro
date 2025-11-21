/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { UserState } from "@/renderer/types/index.js"
import Store from "electron-store"

export type { UserState } from "@/renderer/types/index.js"

class UserStore {
	public _userStore = new Store({ name: "user_message" })

	// -- 设置用户信息，过滤掉不需要的字段
	async setUserState(_userState: UserState) {
		if (_userState.user) {
			const { nickname, groupInfo, approval, headimgurl, ...filteredUser } =
				_userState.user
			this._userStore.set("userState", {
				..._userState,
				user: filteredUser,
			})
		} else {
			this._userStore.set("userState", _userState)
		}
	}

	// -- 获取用户信息
	async getUserState(): Promise<UserState | null> {
		return this._userStore.get("userState") as UserState | null
	}

	// -- 清除用户信息
	async clearUserState() {
		this._userStore.delete("userState")
	}
}

// -- 导出单例
export const userStore = new UserStore()
