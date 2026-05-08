/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { unreadNotificationCountAtom } from "@/renderer/store"
import { useSetAtom } from "jotai"
import { useEffect } from "react"

// -- 应用启动时拉取一次未读数，并订阅 main 推送的 notification:new 实时累加
export const useNotificationsBootstrap = () => {
	const setUnread = useSetAtom(unreadNotificationCountAtom)

	useEffect(() => {
		const api = window.electronAPI
		let cancelled = false

		api
			.getUnreadNotificationCount()
			.then((count) => {
				if (!cancelled) setUnread(count)
			})
			.catch(() => {})

		const unsubscribe = api.onNotification((row) => {
			if (!row.read_at) {
				setUnread((prev) => prev + 1)
			}
		})

		return () => {
			cancelled = true
			unsubscribe()
		}
	}, [setUnread])
}
