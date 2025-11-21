/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { userIdentityAtom } from "@/renderer/store/storage"
import { useAtomValue } from "jotai"

type UserInfoType = {
	isLoggedIn: true
	isMember: boolean
	approval: {
		stock: boolean
		crypto: boolean
		block: boolean
	}
	membershipInfo?: string[]
	clientInfo?: string[]
}
// 收集所需userInfo
export const collectUserInfo = (userInfo: any): UserInfoType => {
	const {
		isMember = false,
		approval = { stock: false, crypto: false, block: false },
		membershipInfo = [],
		clientInfo = [],
	} = userInfo
	return {
		isLoggedIn: true,
		isMember,
		approval,
		membershipInfo,
		clientInfo,
	}
}
// 生成权限标识
export const generatePermissionSet = (userInfo: UserInfoType): string[] => {
	const permissionSet = new Set<string>()
	permissionSet.add("isLoggedIn")
	// 根据会员状态添加会员标识
	if (userInfo.isMember) {
		permissionSet.add("FEN")
	} else {
		permissionSet.add("NON_FEN")
	}

	// 根据购买的课程添加权限标识
	if (userInfo.approval) {
		if (userInfo.approval.stock) permissionSet.add("STOCK")
		if (userInfo.approval.crypto) permissionSet.add("CRYPTO")
		if (userInfo.approval.block) permissionSet.add("BLOCK")
	}

	// 根据购买的分享会添加权限标识
	if (userInfo.membershipInfo?.length) {
		for (const item of userInfo.membershipInfo) {
			permissionSet.add(item)
		}
	}

	return Array.from(permissionSet)
}
export function usePermission() {
	const userIdentity = useAtomValue(userIdentityAtom)
	// 检查权限是否符合
	const checkPermission = (checkArray: string[]) => {
		const boolean = checkArray.every((item) => userIdentity.includes(item))
		return boolean
	}
	// 数据列表查询权限
	const checkDataListPermission = (courseType?: string) => {
		if (checkPermission(["FEN"])) return false
		// 如果查到了权限checkPermission返回true，表格checked如果接收true会被禁用，所以做一下取反操作
		switch (courseType) {
			case "coin":
				return !checkPermission(["CRYPTO"])
			case "stock":
				return !checkPermission(["STOCK"])
			default:
				return true //默认禁用
		}
	}
	return { checkPermission, checkDataListPermission }
}
