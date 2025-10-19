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
	accountRoleUpdateAtom,
	statusQueryAtom,
} from "@/renderer/hooks/useClassStatusInterval"
import {
	collectUserInfo,
	generatePermissionSet,
} from "@/renderer/hooks/useIdentityArray"
import { getUserState, syncUserState } from "@/renderer/ipc/userInfo"
import {
	accountKeyAtom,
	accountRoleAtom,
	isLoginAtom,
	userIdentityAtom,
} from "@/renderer/store/storage"
import type { UserInfo, UserState } from "@/shared/types"
import { atomEffect } from "jotai-effect"
import { atomWithQuery } from "jotai-tanstack-query"
import { RESET, atomWithStorage } from "jotai/utils"
import md5 from "md5"
import { toast } from "sonner"
import { postUserActionMutationAtom } from "./mutation"
const { VITE_BASE_URL } = import.meta.env

const { rendererLog, setStoreValue } = window.electronAPI

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
export const userAtom = atomWithStorage<UserState>(
	"user-storage",
	{
		token: "",
		user: null,
		isLoggedIn: false,
	},
	undefined,
	{ getOnInit: true },
)

export const userAuthAtom = atomWithQuery<{
	name: string
	token: string
	user: UserInfo
	success: boolean
}>((get) => {
	const { isLoggedIn } = get(userAtom)
	const enabled = get(isLoginAtom)
	const newTimestampSign = generateTimestampSign()
	return {
		retry: false,
		refetchInterval: 3 * 1000,
		enabled,
		queryKey: [
			"user-auth",
			get(nonceAtom),
			get(macAddressAtom),
			newTimestampSign, // 使用新的 timestamp_sign
		],
		queryFn: async ({ queryKey: [, nonce, client_id, timestamp_sign] }) => {
			if (isLoggedIn) return null
			try {
				// 发起请求
				const res = await fetch(`${VITE_BASE_URL}/user/client/authorized`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						nonce,
						client_id,
						timestamp_sign,
					}),
				})
				// 如果请求失败，记录错误并返回 null
				if (!res.ok) {
					return null
				}
				// 请求成功，返回解析后的 JSON 数据
				return await res.json()
			} catch (error) {
				return null
			}
		},
	}
})

// -- 账户角色检查
export const checkAccountRoleAtom = atomWithQuery<
	{ msg: string; role: 0 | 1 | 2 },
	{ apiKey: string; uuid: string }
>((get) => {
	const { apiKey, uuid } = get(accountKeyAtom)
	return {
		queryKey: ["check-account-role"],
		queryFn: async () => {
			const headers = { "api-key": apiKey }
			const params = new URLSearchParams({ uuid })
			const response = await fetch(
				`${VITE_BASE_URL}/api/data/status?${params}`,
				{
					headers,
				},
			)

			if (!response.ok) {
				return { msg: "ERROR", role: 0 }
			}

			return response.json()
		},
	}
})

export const checkAccountRoleEffectAtom = atomEffect((get, set) => {
	const { data, isError } = get(checkAccountRoleAtom)
	const { isLoggedIn } = get(userAtom)
	if (isError && isLoggedIn) {
		set(accountRoleAtom, RESET)
		rendererLog("error", "UserDropMenu-用户状态请求失败失败!!!")
		toast.dismiss()
		toast.warning("网络异常，网络恢复后请重启客户端以及重新登录 !!!", {
			duration: 10 * 1000,
		})
		setStoreValue("status", 0)
	}

	if (data && data.msg === "SUCCESS") {
		set(accountRoleAtom, data)
		setStoreValue("status", data.role)
	}
})

// -- 用户状态更新与缓存同步
export const userAuthEffectAtom = atomEffect((get, set) => {
	;(async () => {
		const { isLoggedIn } = get(userAtom)
		const { data } = get(userAuthAtom)
		const { mutateAsync } = get(postUserActionMutationAtom)

		if (!data) return // 如果数据不存在，直接返回

		if (!data?.success) return // 如果请求失败，直接返回

		// 先同步用户状态到主进程
		await syncUserState({
			token: data.token,
			user: data.user,
			isLoggedIn: true,
		})

		// 设置本地文件存储值
		data.user?.uuid && setStoreValue("settings.hid", data.user?.uuid)
		data.user?.apiKey && setStoreValue("settings.api_key", data.user?.apiKey)

		// 从主进程读取用户状态（确保主进程数据主导）
		const userStateFromMain = await getUserState()

		if (userStateFromMain) {
			// 使用从主进程读取的数据设置本地状态
			set(userAtom, userStateFromMain)

			// 如果用户未登录，执行登录请求
			if (!isLoggedIn) {
				await mutateAsync("登录")
			}

			// 账户密钥设置
			if (userStateFromMain.user) {
				set(accountKeyAtom, {
					uuid: userStateFromMain.user.uuid,
					apiKey: userStateFromMain.user.apiKey,
				})

				// 存储用户身份标识
				set(
					userIdentityAtom,
					generatePermissionSet(collectUserInfo(userStateFromMain.user)),
				)
			}

			// 手动触发 accountRoleUpdateAtom
			const { data: roleData } = get(statusQueryAtom)
			if (roleData) {
				set(accountRoleUpdateAtom, roleData)
			}

			rendererLog("info", "[user] 用户信息已从主进程同步到渲染进程")
		}
	})()
})
