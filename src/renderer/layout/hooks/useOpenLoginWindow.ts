/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { isLoginAtom } from "@/renderer/store/storage"
import {
	generateTimestampSign,
	macAddressAtom,
	nonceAtom,
	timestampSignAtom,
	uuidV4,
} from "@/renderer/store/user"
import { useAtomValue, useSetAtom } from "jotai"
import { useCallback } from "react"

const { VITE_BASE_URL } = import.meta.env

/** 与右上角「点击登录」一致的打开登录窗口逻辑 */
export function useOpenLoginWindow() {
	const setNonce = useSetAtom(nonceAtom)
	const clientId = useAtomValue(macAddressAtom)
	const setTimestampSign = useSetAtom(timestampSignAtom)
	const setIsLogin = useSetAtom(isLoginAtom)

	const openLoginWindow = useCallback(() => {
		const newNonce = uuidV4()
		const timestampSign = generateTimestampSign()
		setNonce(newNonce)
		setTimestampSign(timestampSign)

		const loginUrl = `${VITE_BASE_URL}/user/login-page?client_id=${encodeURIComponent(
			clientId,
		)}&nonce=${encodeURIComponent(newNonce)}&opener_origin=${encodeURIComponent(
			location.origin,
		)}&timestamp_sign=${encodeURIComponent(timestampSign)}`

		window.open(loginUrl, "quantclass-login", "width=480,height=640")
	}, [clientId, setNonce, setTimestampSign])

	const requestLogin = useCallback(() => {
		if (!clientId || clientId.length === 0) return
		setIsLogin(true)
		openLoginWindow()
	}, [clientId, openLoginWindow, setIsLogin])

	const canOpenLogin = Boolean(clientId && clientId.length > 0)

	return { requestLogin, canOpenLogin }
}
