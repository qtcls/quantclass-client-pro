/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { postUserAction } from "@/renderer/request"
import { accountKeyAtom } from "@/renderer/store/storage"
import { userAtom } from "@/renderer/store/user"
import { versionsAtom } from "@/renderer/store/versions"
import { atomWithMutation } from "jotai-tanstack-query"
import { syncUserState } from "../ipc/userInfo"
import type { UserInfo } from "../types"

const { VITE_BASE_URL } = import.meta.env
const { rendererLog } = window.electronAPI

export const userInfoMutationAtom = atomWithMutation(() => ({
	mutationKey: ["user-info"],
	mutationFn: async (token: string) => {
		const res = await fetch(`${VITE_BASE_URL}/user/info`, {
			method: "POST",
			headers: {
				authorization: token,
			},
		})

		return ((await res.json()) as UserInfo | null) ?? null
	},
	onSuccess(data) {
		syncUserState({
			user: {
				id: data?.id ?? "",
				uuid: data?.uuid ?? "",
				apiKey: data?.apiKey ?? "",
				headimgurl: data?.headimgurl ?? "",
				isMember: data?.isMember ?? false,
				nickname: data?.nickname ?? "",
				approval: data?.approval ?? {
					block: false,
					crypto: false,
					stock: false,
				},
				membershipInfo: data?.membershipInfo ?? [],
				groupInfo: data?.groupInfo ?? [],
			},
			isLoggedIn: true,
		})
	},
}))

// -- 用户行为记录
export const postUserActionMutationAtom = atomWithMutation((get) => {
	const { uuid = "", apiKey = "" } = get(accountKeyAtom)
	const { clientVersion } = get(versionsAtom)
	const { user } = get(userAtom)

	return {
		mutationKey: ["post-user-action"],
		mutationFn: async (action: string) => {
			if (!apiKey || !uuid) {
				rendererLog("warning", `记录 ${action} 时 apiKey 或 uuid 为空`)
				return
			}

			return postUserAction(apiKey, {
				uuid,
				role: `client-${clientVersion}${user?.isMember ? "-fen" : ""}`,
				action,
			})
		},
		onError: (error) => {
			rendererLog("error", `记录失败: ${error}`)
		},
	}
})
