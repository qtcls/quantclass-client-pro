/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

const { getUserAccount, syncWebUserInfo, setTokens } = window.electronAPI
import { accountKeyAtom } from "@/renderer/store/storage"
import type {
	AccessTokenJwtPayload,
	UserAccount,
} from "@/shared/types"
import { useAtomValue, useSetAtom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { jwtDecode } from "jwt-decode"
import md5 from "md5"
import { useCallback } from "react"
import { settingsAtom } from "./electron"
import { postUserActionMutationAtom } from "./mutation"

const { rendererLog } = window.electronAPI

export function uuidV4() {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0
		const v = c === "x" ? r : (r & 0x3) | 0x8
		return v.toString(16)
	})
}

// -- 生成时间戳签名
export function generateTimestampSign(): string {
	const timestamp = Math.floor(Date.now()).toString()
	const timestampMd5 = md5(timestamp).substring(0, 8)
	return `${timestamp}${timestampMd5}`
}

// export const extraWorkStatusAtom = atomWithStorage<boolean>(
// 	"extra-work-status",
// 	false,
// 	undefined,
// 	{
// 		getOnInit: true,
// 	},
// )

export const macAddressAtom = atomWithStorage<string>(
	"mac-address",
	"",
	undefined,
	{
		getOnInit: true,
	},
)

export const nonceAtom = atomWithStorage<string>("nonce", uuidV4(), undefined, {
	getOnInit: true,
})

export const timestampSignAtom = atomWithStorage<string>(
	"timestamp-sign",
	"",
	undefined,
	{
		getOnInit: true,
	},
)

// -- 用户状态
export const userAtom = atomWithStorage<UserAccount>(
	"user-storage",
	{
		user: null,
		isLoggedIn: false,
		isMember: false,
		isStock: false,
		isCrypto: false,
		isBlock: false,
		roles: {
			fen: { label: "", disabled: true },
			coin: { label: "", disabled: true },
			stock: { label: "", disabled: true },
			block: { label: "", disabled: true },
		},
		permissions: [],
	},
	undefined,
	{ getOnInit: true },
)

// -- 登录成功后的统一处理：由子窗口 postMessage 回传 tokens 后触发
export function useAuthSuccessHandler() {
	const { isLoggedIn } = useAtomValue(userAtom)
	const setUser = useSetAtom(userAtom)
	const setAccountKey = useSetAtom(accountKeyAtom)
	const setSettings = useSetAtom(settingsAtom)
	const { mutateAsync } = useAtomValue(postUserActionMutationAtom)

	return useCallback(
		async (tokens: { access_token: string; refresh_token: string }) => {
			if (!tokens?.access_token || !tokens?.refresh_token) return

			const payload = jwtDecode<AccessTokenJwtPayload>(tokens.access_token)
			if (!payload?.user) return

			setTokens({
				access_token: tokens.access_token,
				refresh_token: tokens.refresh_token,
			})

			// 同步用户状态到主进程
			syncWebUserInfo({
				user: payload.user,
				isLoggedIn: true,
			})

			// 从主进程读取用户状态（确保主进程数据主导）
			const WebUserInfoFromMain = await getUserAccount()
			if (!WebUserInfoFromMain) return

			setUser(WebUserInfoFromMain)

			if (!isLoggedIn) {
				await mutateAsync("登录")
			}

			if (WebUserInfoFromMain.user) {
				setAccountKey({
					uuid: WebUserInfoFromMain.user.uuid,
					apiKey: WebUserInfoFromMain.user.apiKey,
				})
				setSettings((prev) => ({
					...prev,
					hid: WebUserInfoFromMain.user?.uuid ?? "",
					api_key: WebUserInfoFromMain.user?.apiKey ?? "",
				}))
			}

			rendererLog("info", "[user] 用户信息已从主进程同步到渲染进程")
		},
		[isLoggedIn, mutateAsync, setAccountKey, setSettings, setUser],
	)
}
