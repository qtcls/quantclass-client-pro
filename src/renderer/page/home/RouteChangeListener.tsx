/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { userAtom } from "@/renderer/store/user"
import { useAtom } from "jotai"
import { RESET } from "jotai/utils"
import { useEffect } from "react"
import { useLocation } from "react-router"
import { toast } from "sonner"

const { rendererLog, getUserAccount } = window.electronAPI

const RouteChangeListener = () => {
	const location = useLocation()
	const [{ isLoggedIn }, setUser] = useAtom(userAtom)

	//  需要在路由变化时触发用户信息更新
	useEffect(() => {
		// 如果用户未登录，不执行更新逻辑
		if (!isLoggedIn) {
			return
		}

		// 每次路由变化都通过 IPC 获取用户信息（带缓存逻辑）
		getUserAccount()
			.then((userAccount) => {
				if (userAccount) {
					setUser(userAccount)
					rendererLog("info", "[RouteChangeListener] 用户信息已更新")
				} else {
					setUser(RESET)
					toast.dismiss()
					toast.warning("账户信息异常，请重新登录")
				}
			})
			.catch((error) => {
				rendererLog("error", `[RouteChangeListener] 获取用户信息失败: ${error}`)
			})
	}, [location, isLoggedIn]) // 每次路由变化时触发更新

	return null
}

export default RouteChangeListener
