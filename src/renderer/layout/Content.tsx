/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { GlowDot } from "@/renderer/components/ui/glow-dot"
import { Badge } from "@/renderer/components/ui/badge"
import {
	SidebarContent,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/renderer/components/ui/sidebar"
import {
	BACKTEST_PAGE,
	FUSION_STRATEGY_LIBRARY_PAGE,
	NOTIFICATIONS_PAGE,
	POSITION_INFO_PAGE,
	// CHANGE_LOGS_PAGE,
	// FAQ_PAGE,
	// POSITION_INFO_PAGE,
	QUESTION_FEEDBACK_PAGE,
	REAL_MARKET_CONFIG_PAGE,
	REAL_TRADING_TAB_NAME,
	STRATEGY_LIBRARY_PAGE,
	// TRADING_PLAN_PAGE,
} from "@/renderer/constant"
import { cn } from "@/renderer/lib/utils"
import {
	activeTabAtom,
	isAutoRocketAtom,
	isMinDataUpdatingAtom,
	isUpdatingAtom,
	unreadNotificationCountAtom,
} from "@/renderer/store"
import { libraryTypeAtom } from "@/renderer/store/storage"
import { useAtomValue, useSetAtom } from "jotai"
import {
	Activity,
	Bell,
	Briefcase,
	Check,
	Code,
	DatabaseBackup,
	Gamepad2,
	House,
	Library,
	LibraryBig,
	MessageSquareWarning,
	PencilRuler,
	SquareLibrary,
	TvMinimalPlay,
} from "lucide-react"
import { useState } from "react"
import { useLocation, useNavigate } from "react-router"

const data = {
	data: {
		navMain: [
			{
				title: "历史数据",
				url: "/data",
				icon: DatabaseBackup,
			},
			{
				title: "实时数据",
				url: "/realtime_data",
				icon: Activity,
			},
			// {
			// 	title: "策略订阅",
			// 	url: "/strategy",
			// 	icon: ArrowRight,
			// },
		],
	},
	[REAL_TRADING_TAB_NAME]: {
		navMain: [
			{
				title: "选股策略",
				url: STRATEGY_LIBRARY_PAGE,
				icon: LibraryBig,
				libraryType: "select",
			},
			{
				title: "综合策略库",
				url: FUSION_STRATEGY_LIBRARY_PAGE,
				icon: SquareLibrary,
				libraryType: "pos",
			},
			{
				title: "回测",
				url: BACKTEST_PAGE,
				icon: PencilRuler,
			},
			{
				title: "实盘",
				url: REAL_MARKET_CONFIG_PAGE,
				icon: TvMinimalPlay,
			},
			{
				title: "持仓信息",
				url: POSITION_INFO_PAGE,
				icon: Briefcase,
			},
		],
	},
	feedback: {
		navMain: [
			{
				title: "问题反馈",
				url: QUESTION_FEEDBACK_PAGE,
				icon: MessageSquareWarning,
			},
			// {
			// 	title: "常见问题解答",
			// 	url: FAQ_PAGE,
			// 	icon: CircleHelp,
			// },
			// {
			// 	title: "更新日志",
			// 	url: CHANGE_LOGS_PAGE,
			// 	icon: FileClock,
			// },
		],
	},
}

const { openUrl } = window.electronAPI

export const _SidebarContent = () => {
	const { pathname } = useLocation()
	const navigate = useNavigate()
	const [_, setHoveredItems] = useState<Record<string, boolean>>({})
	const setActiveTab = useSetAtom(activeTabAtom)
	const libraryType = useAtomValue(libraryTypeAtom)
	const isUpdating = useAtomValue(isUpdatingAtom)
	const isMinDataUpdating = useAtomValue(isMinDataUpdatingAtom)
	const isAutoRocket = useAtomValue(isAutoRocketAtom)
	const unreadNotificationCount = useAtomValue(unreadNotificationCountAtom)

	return (
		<SidebarContent className="min-w-48">
			<SidebarGroup>
				<SidebarMenu>
					<SidebarMenuItem
						onMouseEnter={() =>
							setHoveredItems((prev) => ({ ...prev, "/": true }))
						}
						onMouseLeave={() =>
							setHoveredItems((prev) => ({ ...prev, "/": false }))
						}
					>
						<SidebarMenuButton
							onClick={() => {
								navigate("/")
								setActiveTab("/")
							}}
							className={cn(
								pathname === "/" &&
									"bg-accent text-accent-foreground font-semibold",
							)}
						>
							{/* <ArrowRight forceAnimate={hoveredItems["/"]} /> */}
							<House />
							<span>首页</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarGroup>

			<SidebarGroup>
				<SidebarGroupLabel>数据中心</SidebarGroupLabel>

				<SidebarMenu>
					{data.data.navMain.map((item) => (
						<SidebarMenuItem
							key={item.url}
							onMouseEnter={() =>
								setHoveredItems((prev) => ({ ...prev, [item.url]: true }))
							}
							onMouseLeave={() =>
								setHoveredItems((prev) => ({ ...prev, [item.url]: false }))
							}
						>
							<SidebarMenuButton
								onClick={() => {
									navigate(item.url)
									setActiveTab("data")
								}}
								className={cn(
									item.url.replace("#", "/") === pathname &&
										"bg-accent text-accent-foreground font-semibold",
								)}
							>
								{item.icon && (
									// <item.icon forceAnimate={hoveredItems[item.url]} />
									<item.icon />
								)}
								<span>{item.title}</span>
								{(item.url === "/data" && isUpdating) ||
								(item.url === "/realtime_data" && isMinDataUpdating) ? (
									<GlowDot
										size="sm"
										color="green"
										className="ml-auto shrink-0"
									/>
								) : null}
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroup>

			<SidebarGroup>
				<SidebarGroupLabel>策略中心</SidebarGroupLabel>

				<SidebarMenu>
					{data[REAL_TRADING_TAB_NAME].navMain.map((item) => (
						<SidebarMenuItem
							key={item.url}
							onMouseEnter={() =>
								setHoveredItems((prev) => ({ ...prev, [item.url]: true }))
							}
							onMouseLeave={() =>
								setHoveredItems((prev) => ({ ...prev, [item.url]: false }))
							}
						>
							<SidebarMenuButton
								onClick={() => {
									setActiveTab("real_trading")
									navigate(item.url)
								}}
								className={cn(
									item.url.replace("#", "/") === pathname &&
										"bg-accent text-accent-foreground font-semibold",
								)}
							>
								{item.icon && <item.icon />}
								<span>{item.title}</span>
								{libraryType === item.libraryType && (
									<Badge variant="default" className="py-0.5 px-1 ml-auto">
										{/* <span className="text-[10px] dark:text-white">已启用</span> */}
										<Check size={12} />
									</Badge>
								)}
								{item.url === REAL_MARKET_CONFIG_PAGE && isAutoRocket && (
									<GlowDot
										size="sm"
										color="green"
										className="ml-auto shrink-0"
									/>
								)}
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}

					<SidebarMenuItem>
						<SidebarMenuButton disabled>
							<Gamepad2 />
							<span>模拟盘（开发中）</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarGroup>

			<SidebarGroup>
				<SidebarGroupLabel>消息中心</SidebarGroupLabel>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							onClick={() => {
								navigate(NOTIFICATIONS_PAGE)
							}}
							className={cn(
								pathname === NOTIFICATIONS_PAGE &&
									"bg-accent text-accent-foreground font-semibold",
							)}
						>
							<Bell />
							<span>通知中心</span>
							{unreadNotificationCount > 0 && (
								<Badge
									variant="destructive"
									className="ml-auto h-4 min-w-4 px-1 py-0 text-[10px] leading-none"
								>
									{unreadNotificationCount > 99
										? "99+"
										: unreadNotificationCount}
								</Badge>
							)}
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarGroup>

			<SidebarGroup>
				<SidebarGroupLabel>研究中心（开发中）</SidebarGroupLabel>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton disabled>
							<Library />
							<span>精心随机策略库</span>
						</SidebarMenuButton>
						<SidebarMenuButton disabled>
							<Code />
							<span>框架源码</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarGroup>

			<SidebarGroup>
				<SidebarGroupLabel>帮助中心</SidebarGroupLabel>

				<SidebarMenu>
					{data.feedback.navMain.map((item) => (
						<SidebarMenuItem
							key={item.url}
							onMouseEnter={() =>
								setHoveredItems((prev) => ({ ...prev, [item.url]: true }))
							}
							onMouseLeave={() =>
								setHoveredItems((prev) => ({ ...prev, [item.url]: false }))
							}
						>
							<SidebarMenuButton
								onClick={() => {
									if (item.url === QUESTION_FEEDBACK_PAGE) {
										openUrl(item.url)
									} else {
										navigate(item.url)
									}
								}}
								className={cn(
									item.url.replace("#", "/") === pathname &&
										"bg-accent text-accent-foreground font-semibold",
								)}
							>
								{item.icon && <item.icon />}
								<span>{item.title}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroup>
		</SidebarContent>
	)
}
