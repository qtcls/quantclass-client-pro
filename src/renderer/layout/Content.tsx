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
	DATA_SECTION_ROUTE,
	HOME_PAGE,
	RESEARCH_SECTION_ROUTE,
	SETTINGS_PAGE,
	TRADING_SECTION_ROUTE,
} from "@/renderer/constant"
import { ThemeCustomizer } from "@/renderer/components/theme-customizer"
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/renderer/components/ui/avatar"
import { UserMenu } from "@/renderer/layout/UserMenu"
import { cn } from "@/renderer/lib/utils"
import { activeTabAtom } from "@/renderer/store"
import { useSetAtom } from "jotai"
import {
	BookOpen,
	Database,
	LayoutGrid,
	Settings,
	TrendingUp,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { FC } from "react"
import { useLocation, useNavigate } from "react-router"
import Img from "../../../build/icon.ico"

interface NavButtonProps {
	icon: LucideIcon
	label: string
	to: string
	active: boolean
	onClick: () => void
}

const NavButton: FC<NavButtonProps> = ({
	icon: Icon,
	label,
	active,
	onClick,
}) => {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative w-12 border-0 bg-transparent rounded-[10px] cursor-pointer transition-colors",
				"text-muted-foreground hover:bg-accent/50 hover:text-foreground",
				active && "text-foreground bg-accent/60",
				"py-2 flex flex-col items-center gap-[5px] text-[11px]",
			)}
		>
			{active && (
				<span className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-sm bg-foreground" />
			)}
			<Icon className="size-[21px]" strokeWidth={1.7} />
			<span className="leading-none">{label}</span>
		</button>
	)
}

const NAV_ITEMS = [
	{ icon: LayoutGrid, label: "总览", to: HOME_PAGE, tab: HOME_PAGE },
	{ icon: Database, label: "数据", to: DATA_SECTION_ROUTE, tab: "data" },
	{
		icon: TrendingUp,
		label: "实盘",
		to: TRADING_SECTION_ROUTE,
		tab: "real_trading",
	},
	{
		icon: BookOpen,
		label: "投研",
		to: RESEARCH_SECTION_ROUTE,
		tab: "research",
	},
]

export const NavRail: FC = () => {
	const { pathname } = useLocation()
	const navigate = useNavigate()
	const setActiveTab = useSetAtom(activeTabAtom)

	const isActive = (to: string) => {
		if (to === HOME_PAGE) return pathname === HOME_PAGE
		return pathname.startsWith(to)
	}

	return (
		<nav className="w-16 border-r bg-background flex flex-col items-center py-3 gap-1.5">
			<div className="mb-2.5" aria-hidden>
				<Avatar className="size-9 rounded-[9px] border bg-white dark:border-white">
					<AvatarImage src={Img} alt="quantclass" />
					<AvatarFallback className="rounded-[9px]">Q</AvatarFallback>
				</Avatar>
			</div>

			{NAV_ITEMS.map((item) => (
				<NavButton
					key={item.to}
					icon={item.icon}
					label={item.label}
					to={item.to}
					active={isActive(item.to)}
					onClick={() => {
						setActiveTab(item.tab)
						navigate(item.to)
					}}
				/>
			))}

			<div className="flex-1" />

			<div className="flex flex-col items-center gap-1.5 pb-1">
				<UserMenu variant="logo" />
				<ThemeCustomizer />
				<button
					type="button"
					className={cn(
						"relative w-12 border-0 bg-transparent rounded-[10px] cursor-pointer transition-colors",
						"text-muted-foreground hover:bg-accent/50 hover:text-foreground",
						pathname === SETTINGS_PAGE && "text-foreground bg-accent/60",
						"py-2.5 flex items-center justify-center",
					)}
					aria-label="设置"
					onClick={() => navigate(SETTINGS_PAGE)}
				>
					{pathname === SETTINGS_PAGE && (
						<span className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-sm bg-foreground" />
					)}
					<Settings className="size-[21px]" strokeWidth={1.7} />
				</button>
			</div>
		</nav>
	)
}
