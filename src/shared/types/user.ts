/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export interface UserInfo {
	[key: string]: any
}

export interface UserAccountInfo {
	id: string
	uuid: string
	apiKey: string
	headimgurl: string
	isMember: boolean
	// 参加小组信息
	groupInfo: string[]
	nickname: string
	membershipInfo: string[]
	approval: {
		block: boolean
		crypto?: boolean
		stock: boolean
	}
}

export interface WebUserInfo {
	user: UserInfo | null
	isLoggedIn: boolean
}

export interface UserAccount {
	isLoggedIn: boolean
	user: UserAccountInfo | null
	// 权限信息
	isMember: boolean
	isStock: boolean
	isCrypto: boolean
	isBlock: boolean
}
