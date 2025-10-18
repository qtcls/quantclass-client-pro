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
import { Button } from "@/renderer/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import {
	DropdownMenu,
	DropdownMenuTrigger,
} from "@/renderer/components/ui/dropdown-menu"
import { SidebarMenuButton } from "@/renderer/components/ui/sidebar"
import { usePermission } from "@/renderer/hooks/useIdentityArray"
import { UserMenuContent } from "@/renderer/layout/UserMenu/UserMenuContent"
import { getStatusExpires } from "@/renderer/request"
import { isLoginAtom, statusExpiresAtom } from "@/renderer/store/storage"
import {
	checkAccountRoleEffectAtom,
	generateTimestampSign,
	macAddressAtom,
	nonceAtom,
	timestampSignAtom,
	userAtom,
	userAuthAtom,
	userAuthEffectAtom,
	uuidV4,
} from "@/renderer/store/user"
import { ReloadIcon } from "@radix-ui/react-icons"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { ChevronsUpDown } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useCallback, useEffect, useMemo, useState } from "react"

const { VITE_BASE_URL } = import.meta.env

export const UserMenu = () => {
	const { checkPermission } = usePermission()
	const [nonce, setNonce] = useAtom(nonceAtom)
	const [{ user, isLoggedIn }] = useAtom(userAtom)
	const clientId = useAtomValue(macAddressAtom)
	const setTimestampSign = useSetAtom(timestampSignAtom)
	const setStatusExpires = useSetAtom(statusExpiresAtom)
	const setIsLogin = useSetAtom(isLoginAtom)

	// -- Mutation
	const [{ data: authResponse }] = useAtom(userAuthAtom)

	// -- Effect Atom
	useAtom(userAuthEffectAtom)
	useAtom(checkAccountRoleEffectAtom)
	// -- Dialog 状态
	const [open, setOpen] = useState(false)
	const [loginUrl, setLoginUrl] = useState("")
	const [qrcodeInvalid, setQrcodeInvalid] = useState(false)
	useEffect(() => {
		if (isLoggedIn) {
			setOpen(false)
			setIsLogin(false)
		}
	}, [isLoggedIn])
	// -- 处理认证响应
	useEffect(() => {
		const handleAuthResponse = async () => {
			if (!authResponse || !user?.apiKey || !user?.uuid || !isLoggedIn) return

			// const { role } = (await checkAccountRole()).data ?? { role: 0 }

			// -- 如果角色不是分享会，则设置状态过期时间
			if (!checkPermission(["FEN"])) {
				const res = await getStatusExpires(user.apiKey, user.uuid)
				if (res.code === 200) {
					setStatusExpires(res.data.valid_to)
				}

				// const extraWorkStatus = await getExtraWorkStatus(user.apiKey, user.uuid)
				// setExtraWorkStatus(extraWorkStatus.data)
				// setStoreValue("extra-work-status", extraWorkStatus.data)
			}
			setOpen(false)
		}

		handleAuthResponse()
	}, [user?.apiKey, user?.uuid])

	// -- 获取操作 URL
	const actionUrl = useMemo(() => {
		return `${VITE_BASE_URL}/user/authorize?client_id=${clientId}&nonce=${nonce}&action=&ignore=0&r=${Math.random()}`
	}, [clientId, nonce])

	// -- 初始化登录
	const initLogin = useCallback(() => {
		setNonce(uuidV4())
		setTimestampSign(generateTimestampSign())
		setLoginUrl(actionUrl)
		setQrcodeInvalid(false)
		setTimeout(() => {
			setOpen(true)
		}, 300)
		setTimeout(
			() => {
				setQrcodeInvalid(true)
			},
			5 * 60 * 1000,
		)
	}, [clientId])

	const onLoginClick = () => {
		if (!isLoggedIn && clientId && clientId.length > 0) {
			initLogin()
		}
	}

	return (
		<>
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
					<SidebarMenuButton
						size="lg"
						onClick={() => {
							onLoginClick()
							setIsLogin(true)
						}}
					>
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

			<Dialog
				open={open}
				onOpenChange={(isOpen) => {
					setOpen(isOpen)
					if (!isOpen) {
						setIsLogin(false)
					}
				}}
			>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>微信扫码登录</DialogTitle>
					</DialogHeader>
					<div className="flex items-center justify-center py-8">
						<div className="text-center">
							<div className="inline-block relative border p-3 border-primary bg-white rounded-lg">
								{loginUrl && (
									<QRCodeSVG size={220} level="H" value={actionUrl} />
								)}
								{qrcodeInvalid && (
									<Button
										variant="outline"
										className="absolute inset-0 w-full h-full bg-black/50 backdrop-blur-sm hover:bg-black/60 focus:ring-2 focus:ring-offset-2 focus:ring-black"
										onClick={() => initLogin()}
									>
										<div className="text-white">
											<ReloadIcon className="w-8 h-8 mx-auto mb-2" />
											<div>二维码失效</div>
											<div>请点击刷新</div>
										</div>
									</Button>
								)}
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
