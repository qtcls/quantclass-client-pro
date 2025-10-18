/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { useHandleTimeTask } from "@/renderer/hooks"
import { clearUserState } from "@/renderer/ipc/userInfo"
import { isUpdatingAtom } from "@/renderer/store"
import {
	accountKeyAtom,
	accountRoleAtom,
	isLoginAtom,
	userIdentityAtom,
} from "@/renderer/store/storage"
import {
	generateTimestampSign,
	nonceAtom,
	timestampSignAtom,
	userAtom,
	uuidV4,
} from "@/renderer/store/user"
import { useAtomValue, useSetAtom } from "jotai"
import { RESET } from "jotai/utils"
import { useNavigate } from "react-router"
import { toast } from "sonner"

export const useLogout = () => {
	const navigate = useNavigate()
	const isUpdating = useAtomValue(isUpdatingAtom)
	const setUser = useSetAtom(userAtom)
	const setAccountKey = useSetAtom(accountKeyAtom)
	const setAccountRole = useSetAtom(accountRoleAtom)
	const setNonce = useSetAtom(nonceAtom)
	const setTimestampSign = useSetAtom(timestampSignAtom)
	const handleTimeTask = useHandleTimeTask()
	const setIsLogin = useSetAtom(isLoginAtom)
	const setUserIdentity = useSetAtom(userIdentityAtom)
	const { deleteStoreValue } = window.electronAPI
	const handleLogout = () => {
		setIsLogin(false)
		setUserIdentity(RESET)
		setUser(RESET)
		setAccountKey(RESET)
		setAccountRole(RESET)
		setTimestampSign(generateTimestampSign())
		setNonce(uuidV4())
		deleteStoreValue("status")
		if (isUpdating) {
			handleTimeTask(true)
		}
		clearUserState()
		navigate("/")
		toast.info("登出成功")
	}

	return { handleLogout }
}
