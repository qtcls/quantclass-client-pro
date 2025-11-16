/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { useAtom, useSetAtom } from "jotai"
import { RESET } from "jotai/utils"
import { useEffect } from "react"
import { toast } from "sonner"
import { settingsAtom } from "../store/electron"
import { userInfoMutationAtom } from "../store/mutation"
import { userAtom } from "../store/user"
import { useInterval } from "./useInterval"

const { rendererLog } = window.electronAPI

/**
 * -- 使用用户信息同步的自定义 Hook
 */
export const useUserInfoSync = () => {
	const [{ user, isLoggedIn }, setUser] = useAtom(userAtom)
	const [{ mutateAsync: fetchUserInfo }] = useAtom(userInfoMutationAtom)
	const setSettings = useSetAtom(settingsAtom)
	const { start, stop } = useInterval(async () => {
		const res = await fetchUserInfo(false)
		if (res) {
			setUser(res)
		} else {
			setSettings((prev) => ({
				...prev,
				hid: "",
				api_key: "",
			}))
			setUser(RESET)
			toast.dismiss()
			toast.warning("账户信息异常，请重新登录")
		}
		rendererLog("info", "[useUserInfoSync] 用户信息已更新")
	}, 1000 * 60) // -- 1分钟轮询

	useEffect(() => {
		if (isLoggedIn) {
			start()
		} else {
			stop()
		}
		return () => stop()
	}, [isLoggedIn])

	const forceRefresh = async () => {
		const res = await fetchUserInfo(true)
		if (res) {
			setUser(res)
		} else {
			setUser(RESET)
			setSettings((prev) => ({
				...prev,
				hid: "",
				api_key: "",
			}))
			toast.dismiss()
			toast.warning("账户信息异常，请重新登录")
		}
	}

	return { user, isLoggedIn, forceRefresh }
}
