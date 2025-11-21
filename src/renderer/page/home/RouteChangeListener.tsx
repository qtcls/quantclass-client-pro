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
import { userIdentityAtom } from "@/renderer/store/storage"
import { useInfoAtom, userInfoTtlAtom } from "@/renderer/store/user"
import { useAtom, useSetAtom } from "jotai"
import { useEffect } from "react"
import { useLocation } from "react-router"
const RouteChangeListener = () => {
	const location = useLocation()
	const [{ data, refetch }] = useAtom(useInfoAtom)
	const setUserIdentity = useSetAtom(userIdentityAtom)
	const [ttl, setTtl] = useAtom(userInfoTtlAtom)

	useEffect(() => {
		if (data) {
			setUserIdentity(generatePermissionSet(collectUserInfo(data))) // 存储用户身份标识
		}

		const now = Date.now()

		if (refetch && now > ttl) {
			refetch()
			const randomGap =
				Math.floor(Math.random() * 1000 * 60 * 5) + 31 * 1000 * 60 // 随机过期时间
			setTtl(now + randomGap) // 随机过期时间
		} else {
			console.log("info valid sec.", (ttl - now) / 1000)
		}
	}, [location, refetch, data]) // 依赖于 location，每次路由变化时都会触发 refetch

	return null
}

export default RouteChangeListener
