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
 * @returns 权限对象，包含 isMember, isStock, isCrypto, isBlock, roles
 */
export function calculatePermissions(user: UserInfo | null) {
	if (!user) {
		return {
			isMember: false,
			isStock: false,
			isCrypto: false,
			isBlock: false,
			roles: {
				fen: { label: "分享会", disabled: true },
				coin: { label: "B 圈", disabled: true },
				stock: { label: "股票", disabled: true },
				block: { label: "区块链", disabled: true },
			},
		}
	}

	const isMember = user.isMember ?? false
	const isStock = user.approval?.stock ?? false
	const isCrypto = user.approval?.crypto ?? false
	const isBlock = user.approval?.block ?? false

	return {
		isMember,
		isStock,
		isCrypto,
		isBlock,
		roles: {
			fen: { label: "分享会", disabled: !isMember },
			coin: { label: "B 圈", disabled: !isCrypto },
			stock: { label: "股票", disabled: !isStock },
			block: { label: "区块链", disabled: !isBlock },
		},
	}
}
