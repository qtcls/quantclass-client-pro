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
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@/renderer/components/ui/dropdown-menu"
import { useLogout } from "@/renderer/layout/UserMenu/useLogout"
import { cn } from "@/renderer/lib/utils"
import type { UserAccountInfo } from "@/shared/types"
import { LogOut, Sparkles } from "lucide-react"

interface UserMenuContentProps {
	user: UserAccountInfo | null
}

export const UserMenuContent = ({ user }: UserMenuContentProps) => {
	const { handleLogout } = useLogout()
	const { openUrl } = window.electronAPI
	return (
		<DropdownMenuContent
			className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
			side="bottom"
			align="end"
			sideOffset={4}
		>
			<DropdownMenuLabel className="p-0 font-normal">
				<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
					<Avatar className="h-8 w-8 rounded-lg">
						<AvatarImage src={user?.headimgurl} alt={user?.nickname} />
						<AvatarFallback className="rounded-lg">CN</AvatarFallback>
					</Avatar>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-semibold">{user?.nickname}</span>
					</div>
				</div>
			</DropdownMenuLabel>
			<DropdownMenuSeparator />
			<DropdownMenuGroup>
				<DropdownMenuItem
					className={cn(user?.isMember && "hover:cursor-default")}
					onClick={() => {
						openUrl("https://www.quantclass.cn/fen/class/fen-2025")
					}}
				>
					<Sparkles />
					{user?.isMember ? "已开通分享会" : "了解分享会"}
				</DropdownMenuItem>
			</DropdownMenuGroup>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => handleLogout()}>
				<LogOut />
				登出
			</DropdownMenuItem>
		</DropdownMenuContent>
	)
}
