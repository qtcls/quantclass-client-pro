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
	id: string
	uuid: string
	apiKey: string
	headimgurl: string
	nickname: string
	isMember: boolean | null
	isSciship: boolean | null
	// 访问权限
	access: {
		block: boolean
		crypto: boolean
		stock: boolean
		x: any | null
	}
	// 课程审批
	approval: {
		block: boolean
		crypto?: boolean
		stock: boolean
	}
	// 资产信息
	assets: {
		hulu: {
			gold: number
			gold_cum: number
			name: string
			platinum: number
			silver: number
			silver_cum: number
		}
	}
	// 用户信息
	bbsmid: string
	email: string | null
	virgin: boolean
	is_approved: boolean
	data_perms_advanced: boolean
	// 参加小组信息
	groupInfo: string[]
	clientInfo: string[]
	membershipInfo: string[]
	liteClassInfo: any[]
	serviceInfo: any[]
	shipInfo: any[]
	ship_vx_group: any[]
	// 课程下载链接
	courseDownloadLink: {
		groups: Record<string, any>
		services: Record<string, any>
		stock: any[]
	}
	course_access_link: Record<string, any>
	// 会员信息
	membership: Record<string, any>
	sciship: Record<string, any>
	// 额外信息
	extra: {
		aiServiceId?: string
	}
	form: Record<string, any>
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

export interface UserState {
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
