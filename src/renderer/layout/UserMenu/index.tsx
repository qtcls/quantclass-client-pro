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
	DropdownMenu,
	DropdownMenuTrigger,
} from "@/renderer/components/ui/dropdown-menu"
import { UserMenuContent } from "@/renderer/layout/UserMenu/UserMenuContent"
import { useOpenLoginWindow } from "@/renderer/layout/hooks/useOpenLoginWindow"
import { cn } from "@/renderer/lib/utils"
import { getStatusExpires } from "@/renderer/request"
import { isLoginAtom, statusExpiresAtom } from "@/renderer/store/storage"
import { userAtom } from "@/renderer/store/user"
import { checkPermission } from "@/shared/lib/permission"
import { useAtom, useSetAtom } from "jotai"
import { ChevronsUpDown, UserRound } from "lucide-react"
import { useEffect } from "react"

interface UserMenuProps {
	variant?: "header" | "rail" | "logo"
}

export const UserMenu = ({ variant = "header" }: UserMenuProps) => {
	const [{ user, isLoggedIn, permissions }] = useAtom(userAtom)
	const isMemberOrStock = checkPermission(
		permissions,
		"isMember",
		"isStock",
	)
	const setStatusExpires = useSetAtom(statusExpiresAtom)
	const setIsLogin = useSetAtom(isLoginAtom)
	const { requestLogin, canOpenLogin } = useOpenLoginWindow()

	useEffect(() => {
		if (!isLoggedIn) return
		setIsLogin(false)
		if (isMemberOrStock) return
		;(async () => {
			const res = await getStatusExpires()
			if (res.code === 200) {
				setStatusExpires(res.data.valid_to)
			}
		})()
	}, [isLoggedIn, isMemberOrStock, setIsLogin, setStatusExpires])

	const onLoginClick = () => {
		if (!isLoggedIn && canOpenLogin) requestLogin()
	}

	const logoAvatar = isLoggedIn ? (
		<Avatar className="size-9 rounded-[9px] border border-border">
			<AvatarImage
				src={user?.headimgurl}
				alt={user?.nickname}
				className="rounded-[9px]"
			/>
			<AvatarFallback className="rounded-[9px] bg-muted">
				<UserRound className="size-[18px]" strokeWidth={1.8} />
			</AvatarFallback>
		</Avatar>
	) : (
		<span className="size-9 rounded-[9px] border border-dashed border-muted-foreground/35 bg-muted/50 grid place-items-center text-muted-foreground transition-colors group-hover:border-foreground/25 group-hover:bg-muted/80 group-hover:text-foreground">
			<UserRound className="size-[18px]" strokeWidth={1.8} />
		</span>
	)

	if (variant === "logo") {
		const logoTrigger = (
			<button
				type="button"
				className={cn(
					"relative w-12 py-1.5 flex flex-col items-center justify-center rounded-[10px] cursor-pointer transition-colors",
					"text-muted-foreground hover:bg-accent/50 hover:text-foreground",
				)}
				aria-label={isLoggedIn ? "账户" : "登录"}
			>
				{logoAvatar}
			</button>
		)

		if (!isLoggedIn) {
			return (
				<div className="relative flex flex-col items-center w-12">
					<button
						type="button"
						className={cn(
							"group relative w-12 py-1.5 flex flex-col items-center justify-center gap-1 rounded-[10px] cursor-pointer transition-colors",
							"text-muted-foreground hover:bg-accent/50 hover:text-foreground",
						)}
						aria-label="登录"
						onClick={onLoginClick}
					>
						{logoAvatar}
						<span className="text-[10px] leading-none font-medium">登录</span>
					</button>
				</div>
			)
		}

		return (
			<div className="relative flex flex-col items-center w-12">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>{logoTrigger}</DropdownMenuTrigger>
					<UserMenuContent user={user} side="right" align="end" />
				</DropdownMenu>
			</div>
		)
	}

	const userMenuButtonClass = cn(
		"h-12 w-auto justify-start gap-2 px-2 font-normal",
	)

	if (variant === "rail") {
		const railTrigger = (
			<button
				type="button"
				className={cn(
					"relative w-12 border-0 bg-transparent rounded-[10px] cursor-pointer transition-colors",
					"text-muted-foreground hover:bg-accent/50 hover:text-foreground",
					"py-2.5 flex items-center justify-center",
				)}
				aria-label={isLoggedIn ? "账户" : "登录"}
			>
				<Avatar className="size-[21px] rounded-md">
					<AvatarImage src={user?.headimgurl} alt={user?.nickname} />
					<AvatarFallback className="rounded-md text-[9px]">CN</AvatarFallback>
				</Avatar>
			</button>
		)

		if (!isLoggedIn) {
			return (
				<button
					type="button"
					className={cn(
						"relative w-12 border-0 bg-transparent rounded-[10px] cursor-pointer transition-colors",
						"text-muted-foreground hover:bg-accent/50 hover:text-foreground",
						"py-2.5 flex items-center justify-center",
					)}
					aria-label="登录"
					onClick={onLoginClick}
				>
					<Avatar className="size-[21px] rounded-md">
						<AvatarImage src={user?.headimgurl} alt={user?.nickname} />
						<AvatarFallback className="rounded-md text-[9px]">
							CN
						</AvatarFallback>
					</Avatar>
				</button>
			)
		}

		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>{railTrigger}</DropdownMenuTrigger>
				<UserMenuContent user={user} side="right" align="end" />
			</DropdownMenu>
		)
	}

	return (
		<DropdownMenu>
			{isLoggedIn ? (
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className={userMenuButtonClass}>
						<Avatar className="h-8 w-8 rounded-lg">
							<AvatarImage src={user?.headimgurl} alt={user?.nickname} />
							<AvatarFallback className="rounded-lg">CN</AvatarFallback>
						</Avatar>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-semibold">{user?.nickname}</span>
						</div>
						<ChevronsUpDown className="ml-auto size-4" />
					</Button>
				</DropdownMenuTrigger>
			) : (
				<Button
					variant="ghost"
					className={userMenuButtonClass}
					onClick={onLoginClick}
				>
					<Avatar className="h-8 w-8 rounded-lg">
						<AvatarImage src={user?.headimgurl} alt={user?.nickname} />
						<AvatarFallback className="rounded-lg">CN</AvatarFallback>
					</Avatar>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-semibold">点击登录</span>
					</div>
				</Button>
			)}

			<UserMenuContent user={user} />
		</DropdownMenu>
	)
}
