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
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/renderer/components/ui/avatar"
import {
	DropdownMenu,
	DropdownMenuTrigger,
} from "@/renderer/components/ui/dropdown-menu"
import { SidebarMenuButton } from "@/renderer/components/ui/sidebar"
import { UserMenuContent } from "@/renderer/layout/UserMenu/UserMenuContent"
import { getStatusExpires } from "@/renderer/request"
import { isLoginAtom, statusExpiresAtom } from "@/renderer/store/storage"
import {
	generateTimestampSign,
	macAddressAtom,
	nonceAtom,
	timestampSignAtom,
	userAtom,
	uuidV4,
} from "@/renderer/store/user"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { ChevronsUpDown } from "lucide-react"
import { useCallback, useEffect } from "react"

const { VITE_BASE_URL } = import.meta.env

export const UserMenu = () => {
	const setNonce = useSetAtom(nonceAtom)
	const [{ user, isLoggedIn, isMember }] = useAtom(userAtom)
	const clientId = useAtomValue(macAddressAtom)
	const setTimestampSign = useSetAtom(timestampSignAtom)
	const setStatusExpires = useSetAtom(statusExpiresAtom)
	const setIsLogin = useSetAtom(isLoginAtom)

	useEffect(() => {
		if (!isLoggedIn) return
		setIsLogin(false)
		if (isMember) return
		;(async () => {
			const res = await getStatusExpires()
			if (res.code === 200) {
				setStatusExpires(res.data.valid_to)
			}
		})()
	}, [isLoggedIn, isMember, setIsLogin, setStatusExpires])

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

	const onLoginClick = () => {
		if (!isLoggedIn && clientId && clientId.length > 0) {
			setIsLogin(true)
			openLoginWindow()
		}
	}

	return (
		<DropdownMenu>
			{isLoggedIn ? (
				<DropdownMenuTrigger asChild>
					<SidebarMenuButton size="lg">
						<Avatar className="h-8 w-8 rounded-lg">
							<AvatarImage src={user?.headimgurl} alt={user?.nickname} />
							<AvatarFallback className="rounded-lg">CN</AvatarFallback>
						</Avatar>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-semibold">{user?.nickname}</span>
						</div>
						<ChevronsUpDown className="ml-auto size-4" />
					</SidebarMenuButton>
				</DropdownMenuTrigger>
			) : (
				<SidebarMenuButton size="lg" onClick={onLoginClick}>
					<Avatar className="h-8 w-8 rounded-lg">
						<AvatarImage src={user?.headimgurl} alt={user?.nickname} />
						<AvatarFallback className="rounded-lg">CN</AvatarFallback>
					</Avatar>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-semibold">点击登录</span>
					</div>
				</SidebarMenuButton>
			)}

			<UserMenuContent user={user} />
		</DropdownMenu>
	)
}
