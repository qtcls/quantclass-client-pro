/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { UserInfo } from "@/shared/types/user.js"

/**
 * 计算用户权限信息
 * @param user 用户信息
 * @returns 权限对象，包含 isMember, isStock, isCrypto, isBlock
 */
export function calculatePermissions(user: UserInfo | null) {
	if (!user) {
		return {
			isMember: false,
			isStock: false,
			isCrypto: false,
			isBlock: false,
		}
	}

	return {
		isMember: user.isMember ?? false,
		isStock: user.approval?.stock ?? false,
		isCrypto: user.approval?.crypto ?? false,
		isBlock: user.approval?.block ?? false,
	}
}
