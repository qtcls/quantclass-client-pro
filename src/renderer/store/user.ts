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
import { syncUserState } from "@/renderer/ipc/userInfo"
import {
	accountKeyAtom,
	accountRoleAtom,
	isLoginAtom,
	userIdentityAtom,
} from "@/renderer/store/storage"
import type { UserState } from "@/renderer/types"
import { atom } from "jotai"
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

export const userAuthAtom = atomWithQuery<UserState & { success: boolean }>(
	(get) => {
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
	},
)

export const userInfoTtlAtom = atom<number>(0)

export const useInfoAtom = atomWithQuery<UserState & { success: boolean }>(
	() => {
		return {
			retry: false,
			queryKey: ["user-info"],
			queryFn: async () => {
				const token = localStorage.getItem("user-storage")
				if (!token) return null
				const parsedToken = JSON.parse(token)
				const tokenData = parsedToken.token
				const res = await fetch(`${VITE_BASE_URL}/user/info`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: tokenData,
					},
					body: JSON.stringify({}),
				})

				if (!res.ok) return null
				return await res.json()
			},
		}
	},
)

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

		// 基础用户信息设置
		set(userAtom, {
			token: data.token,
			user: data.user,
			isLoggedIn: true,
		})

		// 账户密钥设置
		set(accountKeyAtom, {
			uuid: data.user?.uuid!,
			apiKey: data.user?.apiKey!,
		})

		// 如果用户未登录，执行登录请求
		if (!isLoggedIn) {
			await mutateAsync("登录")
		}

		// 手动触发 accountRoleUpdateAtom
		const { data: roleData } = get(statusQueryAtom)
		if (roleData) {
			set(accountRoleUpdateAtom, roleData)
		}

		// 同步用户状态到主进程
		await syncUserState({
			user: {
				id: data.user?.id ?? "",
				uuid: data.user?.uuid ?? "",
				apiKey: data.user?.apiKey ?? "",
				headimgurl: data.user?.headimgurl ?? "",
				isMember: data.user?.isMember ?? false,
				nickname: data.user?.nickname ?? "",
				approval: data.user?.approval ?? {
					block: false,
					crypto: false,
					stock: false,
				},
				membershipInfo: data.user?.membershipInfo ?? [],
				groupInfo: data.user?.groupInfo ?? [],
			},
			isLoggedIn: true,
		})

		// 存储用户身份标识
		set(userIdentityAtom, generatePermissionSet(collectUserInfo(data.user)))

		// 设置本地存储值
		data.user?.uuid && setStoreValue("settings.hid", data.user?.uuid)
		data.user?.apiKey && setStoreValue("settings.api_key", data.user?.apiKey)
		//   console.log(data.user?.apiKey,'更新后的apikey');

		// 提示用户数据已同步
		//   console.log("用户信息已同步");
	})()
})
