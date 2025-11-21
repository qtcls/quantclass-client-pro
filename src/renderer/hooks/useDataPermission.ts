/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { accountRoleAtom, statusExpiresAtom } from "@/renderer/store/storage"
import { userAtom } from "@/renderer/store/user"
import dayjs from "dayjs"
import { useAtomValue } from "jotai"

interface IDataPermissionProps {
	courseType?: string
}

export function useDataPermission() {
	const { user } = useAtomValue(userAtom)
	const { role } = useAtomValue(accountRoleAtom)
	// const extraWorkStatus = useAtomValue(extraWorkStatusAtom)
	const statusExpires = useAtomValue(statusExpiresAtom)

	const checkPermission = ({ courseType }: IDataPermissionProps) => {
		// -- 分享会有所有数据权限
		if (user?.isMember && role === 2) return false

		const hasNoGroup = user?.groupInfo.length === 0
		const hasApiPermission =
			statusExpires && dayjs(statusExpires).isAfter(dayjs())

		// -- 数据为币圈数据
		if (courseType === "coin") {
			// -- 没有币圈权限
			if (!user?.approval.crypto) return true
			// -- 有币圈权限，并且有 Api 权限，则不禁用
			if (hasApiPermission) return false
			// -- 有币圈权限，既没有参加过小组并且没有完成过作业，禁用
			// if (hasNoGroup && !extraWorkStatus) return true

			return false
		}

		// -- 数据为股票数据
		if (courseType === "stock") {
			// -- 没有股票权限
			if (!user?.approval.stock) return true
			// -- 有股票权限，并且有 Api 权限，则不禁用
			if (hasApiPermission) return false
			// -- 有股票权限，既没有参加过小组并且没有完成过作业，禁用
			// if (hasNoGroup && !extraWorkStatus) return true

			return false
		}

		// -- 非会员默认禁用
		return true
	}

	// -- 获取有权限的数据类型
	const getPermittedDataTypes = () => {
		const hasApiPermission =
			statusExpires && dayjs(statusExpires).isAfter(dayjs())
		const hasNoGroup = user?.groupInfo.length === 0
		const permittedTypes: string[] = []

		// -- 分享会员有所有权限
		if (user?.isMember && role === 2) {
			return ["coin", "stock", "fen"]
		}

		// // -- 币圈权限
		// if (user?.approval.crypto) {
		// 	if (hasApiPermission || !(hasNoGroup && !extraWorkStatus)) {
		// 		permittedTypes.push("coin")
		// 	}
		// }

		// // -- 股票权限
		// if (user?.approval.stock) {
		// 	if (hasApiPermission || !(hasNoGroup && !extraWorkStatus)) {
		// 		permittedTypes.push("stock")
		// 	}
		// }

		return permittedTypes
	}

	return { checkPermission, getPermittedDataTypes }
}
