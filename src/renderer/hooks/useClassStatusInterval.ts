/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { accountKeyAtom, accountRoleAtom } from "@/renderer/store/storage"
import { atom } from "jotai"
import { atomWithQuery } from "jotai-tanstack-query"
import { RESET } from "jotai/utils"
import { toast } from "sonner"

const { VITE_BASE_URL } = import.meta.env

const { setStoreValue, rendererLog } = window.electronAPI

// -- 状态查询 atom
export const statusQueryAtom = atomWithQuery((get) => {
	const { uuid, apiKey } = get(accountKeyAtom)

	return {
		queryKey: ["status", uuid, apiKey],
		queryFn: async () => {
			if (!uuid || !apiKey) return null

			const headers = { "api-key": apiKey }
			const params = new URLSearchParams({ uuid })
			const url = `${VITE_BASE_URL}/api/data/status?${params}`
			const response = await fetch(url, { headers })
			return response.json() as Promise<{ msg: string; role: 0 | 1 | 2 }>
		},
		refetchInterval: 1000 * 60 * 60 * 24, // -- 24 小时轮询一次
		retry: false,
		enabled: Boolean(uuid && apiKey),
	}
})

// -- 自动更新 accountRole 的 atom
export const accountRoleUpdateAtom = atom(
	(get) => get(statusQueryAtom),
	(get, set, _update) => {
		const { data, error } = get(statusQueryAtom)

		if (data) {
			set(accountRoleAtom, data)
			setStoreValue("status", data.role)
		}

		if (error) {
			set(accountRoleAtom, RESET)
			rendererLog("error", "用户状态请求刷新失败!!!")
			toast.dismiss()
			toast.warning("网络异常，网络恢复后请重启客户端以及重新登录!!!", {
				duration: 10 * 1000,
			})
		}
	},
)
