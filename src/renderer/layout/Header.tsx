/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { CommandShortcut } from "@/renderer/components/ui/command"
import {
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/renderer/components/ui/sidebar"
import {
	DATA_PAGE,
	DATA_SECTION_PAGE,
	DATA_TAB_NAME,
	HOME_PAGE,
	REAL_TRADING_SECTION_PAGE,
	REAL_TRADING_TAB_NAME,
	SETTINGS_PAGE,
	TRADING_MAIN_PAGE,
	isWindows,
} from "@/renderer/constant"
import { type HotkeyItem, useHotkeys } from "@/renderer/hooks/useHotkeys"
import { SettingsGearIcon } from "@/renderer/icons/SettingsGearIcon"
import { QuickCommand } from "@/renderer/layout/QuickCommand"
import { QuickSearchInput } from "@/renderer/layout/QuickSearchInput"
import { activeTabAtom } from "@/renderer/store"
import { userAtom } from "@/renderer/store/user"
import { useUpdateEffect } from "etc-hooks"
import { useAtom, useAtomValue } from "jotai"
import {
	AudioWaveform,
	GalleryVerticalEnd,
	KanbanIcon,
	type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import { useLocation, useNavigate } from "react-router"

interface PlateConfig {
	name: string
	logo: LucideIcon
	plan: string
	url: string
	tabName: string
}

const BASE_PLATES: Record<string, PlateConfig> = {
	"/": {
		name: "首页",
		logo: KanbanIcon,
		plan: "总览数据模块",
		url: HOME_PAGE,
		tabName: HOME_PAGE,
	},
	data: {
		name: "数据板块",
		logo: GalleryVerticalEnd,
		plan: "整合数据下载",
		url: DATA_PAGE,
		tabName: DATA_TAB_NAME,
	},
}

const TRADING_PLATE: Record<string, PlateConfig> = {
	real_trading: {
		name: "实盘板块",
		logo: AudioWaveform,
		plan: "整合股票回测、实盘",
		url: TRADING_MAIN_PAGE,
		tabName: REAL_TRADING_TAB_NAME,
	},
}

export const _SidebarHeader = () => {
	const { pathname } = useLocation()
	const { isMember } = useAtomValue(userAtom)
	const navigate = useNavigate()
	const [isHovered, setIsHovered] = useState<boolean>(false)
	const [_, setActiveTab] = useAtom(activeTabAtom)

	const { VITE_XBX_ENV } = import.meta.env

	// 实盘交易权限检查
	const canRealTrading =
		VITE_XBX_ENV === "development" ||
		(isMember && isWindows && VITE_XBX_ENV === "production")

	const Plates = canRealTrading
		? { ...BASE_PLATES, ...TRADING_PLATE }
		: BASE_PLATES

	const handleNavigate = (plate: PlateConfig) => {
		setActiveTab(plate.tabName)
		navigate(plate.url)
	}

	const generateHotkey = (plate: PlateConfig, index: number): HotkeyItem => [
		`mod+${index + 1}`,
		() => handleNavigate(plate),
	]

	const hotKeys: HotkeyItem[] = [
		...Object.values(Plates).map((plate, index) =>
			generateHotkey(plate, index),
		),
		["mod+,", () => navigate(SETTINGS_PAGE)],
	]

	useHotkeys(hotKeys)

	useUpdateEffect(() => {
		if (DATA_SECTION_PAGE.includes(pathname)) {
			setActiveTab(DATA_TAB_NAME)
		} else if (REAL_TRADING_SECTION_PAGE.includes(pathname)) {
			setActiveTab(REAL_TRADING_TAB_NAME)
		} else if (pathname === HOME_PAGE) {
			setActiveTab(HOME_PAGE)
		}
	}, [pathname])

	return (
		<SidebarHeader>
			<SidebarMenu>
				<QuickSearchInput />
				<QuickCommand />

				<SidebarMenuItem
					onMouseEnter={() => setIsHovered(true)}
					onMouseLeave={() => setIsHovered(false)}
				>
					<SidebarMenuButton
						onClick={() => navigate(SETTINGS_PAGE)}
						className="group"
					>
						<SettingsGearIcon forceAnimate={isHovered} />
						<span>设置</span>
						<CommandShortcut>
							{isWindows ? "Ctrl + ," : "⌘ + ,"}
						</CommandShortcut>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		</SidebarHeader>
	)
}
