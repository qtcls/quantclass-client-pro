/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import {
	collectUserInfo,
	generatePermissionSet,
} from "@/renderer/hooks/useIdentityArray"
import { updateUserInfo } from "@/renderer/ipc/userInfo"
import { userIdentityAtom } from "@/renderer/store/storage"
import { userAtom } from "@/renderer/store/user"
import { useAtom, useSetAtom } from "jotai"
import { useEffect } from "react"
import { useLocation } from "react-router"

const { rendererLog } = window.electronAPI

const RouteChangeListener = () => {
	const location = useLocation()
	const [{ user, isLoggedIn }, setUser] = useAtom(userAtom)
	const setUserIdentity = useSetAtom(userIdentityAtom)

	useEffect(() => {
		// 更新用户身份标识
		if (user) {
			setUserIdentity(generatePermissionSet(collectUserInfo(user)))
		}
	}, [user])

	useEffect(() => {
		// 如果用户未登录，不执行更新逻辑
		if (!isLoggedIn) {
			return
		}

		// 每次路由变化都通过 IPC 更新用户信息
		updateUserInfo()
			.then((userAccount) => {
				if (userAccount) {
					setUser(userAccount)
					rendererLog("info", "[RouteChangeListener] 用户信息已更新")
				}
			})
			.catch((error) => {
				rendererLog("error", `[RouteChangeListener] 更新用户信息失败: ${error}`)
			})
	}, [location, isLoggedIn]) // 每次路由变化时触发更新

	return null
}

export default RouteChangeListener
