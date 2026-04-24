/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { useAuthSuccessHandler } from "@/renderer/store/user"
import { useEffect } from "react"
import { toast } from "sonner"

const { VITE_BASE_URL } = import.meta.env

const AUTH_MESSAGE_SOURCE = "quantclass-auth"

interface AuthSuccessPayload {
	access_token: string
	refresh_token: string
}

interface AuthMessage {
	source?: string
	type?: "login-success" | "login-expired" | "login-cancel" | "login-error"
	payload?: AuthSuccessPayload & { message?: string }
}

// -- 监听扫码登录子窗口通过 window.opener.postMessage 回传的消息
export function useAuthMessageListener() {
	const onAuthSuccess = useAuthSuccessHandler()

	useEffect(() => {
		let backendOrigin = ""
		try {
			backendOrigin = new URL(VITE_BASE_URL).origin
		} catch {
			backendOrigin = ""
		}

		const handler = async (event: MessageEvent) => {
			if (!backendOrigin || event.origin !== backendOrigin) return

			const msg = event.data as AuthMessage | null
			if (!msg || msg.source !== AUTH_MESSAGE_SOURCE) return

			switch (msg.type) {
				case "login-success":
					if (msg.payload?.access_token && msg.payload?.refresh_token) {
						await onAuthSuccess({
							access_token: msg.payload.access_token,
							refresh_token: msg.payload.refresh_token,
						})
					}
					break
				case "login-expired":
					toast.warning("二维码已失效，请重新打开登录窗口")
					break
				case "login-error":
					toast.error(msg.payload?.message ?? "登录失败，请重试")
					break
				default:
					break
			}
		}

		window.addEventListener("message", handler)
		return () => window.removeEventListener("message", handler)
	}, [onAuthSuccess])
}
