/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { type FC, useEffect } from "react"
import { Outlet, useLocation } from "react-router"

import {
	useGlobalValue,
	useLifeCycle,
	useNetInterval,
	useNetworkToast,
	useRouterGuard,
} from "@/renderer/hooks"

import {
	isFullscreenAtom,
	isShowMonitorPanelAtom,
	loadingAnimeAtom,
} from "@/renderer/store"

import LoadingAnime from "@/renderer/components/LoadingAnime"
import MonitorDialog from "@/renderer/components/MonitorDialog"
import {
	Sidebar,
	SidebarInset,
	SidebarProvider,
	SidebarRail,
} from "@/renderer/components/ui/sidebar"
import { useCalcTotalWeight } from "@/renderer/hooks/useCalcTotalWeight"
import { Footer } from "@/renderer/layout/Footer"
import { UserMenu } from "@/renderer/layout/UserMenu"
import { _BreadCrumb } from "./BreadCrumb"
import { _SidebarContent } from "./Content"
import { _SiderFooter } from "./Footer"
import WindowsBar from "./WindowsBar"
import { useReportErr } from "./hooks/useReportErr"

// -- Utils & Constants
import { AlertDialogProvider } from "@/renderer/context/alert-dialog"
import VersionUpgrade from "@/renderer/layout/version-upgrade"
import { cn } from "@/renderer/lib/utils"
import { useLocalVersions } from "../store/versions"

const { handleToggleFullscreen } = window.electronAPI

// -- Types
interface MainLayoutProps {
	loading: boolean
	content: string | undefined
	isShowMonitorPanel: boolean
}

const Layout: FC = () => {
	useGlobalValue()
	useRouterGuard()
	useNetInterval()
	useLifeCycle()
	// useMigrateStrategyData()
	useCalcTotalWeight()
	useNetworkToast()

	// -- State & Atoms
	const { pathname } = useLocation()
	const [loading] = useAtom(loadingAnimeAtom)
	const setIsFullscreen = useSetAtom(isFullscreenAtom)
	const isShowMonitorPanel = useAtomValue(isShowMonitorPanelAtom)
	const { content } = useReportErr()

	// -- Hooks
	const { refetchLocalVersions } = useLocalVersions()

	// -- Effects
	useEffect(() => {
		refetchLocalVersions()
	}, [pathname])

	// -- Handlers
	const toggleFullscreen = () => {
		handleToggleFullscreen()
		setIsFullscreen((prev) => !prev)
	}

	return (
		<>
			<WindowsBar toggleFullscreen={toggleFullscreen} />

			<SidebarProvider className="h-[calc(100svh-2.5rem)] min-h-[calc(100svh-2.5rem)] dddd">
				<Sidebar
					// variant="floating"
					collapsible="none"
					className="h-[calc(100svh-2.5rem)] bottom-0 top-10 border-r"
				>
					<_SidebarContent />
					<_SiderFooter />
					<SidebarRail />
				</Sidebar>

				<MainLayout
					loading={loading}
					content={content}
					isShowMonitorPanel={isShowMonitorPanel}
				/>
			</SidebarProvider>
			<VersionUpgrade />
		</>
	)
}

export default Layout

const MainLayout: FC<MainLayoutProps> = ({
	loading,
	content,
	isShowMonitorPanel,
}) => {
	useLocation()
	return (
		<SidebarInset className="min-h-[calc(100svh-2.5rem-1px)] h-[calc(100svh-2.5rem-1px)] overflow-y: auto">
			<header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
				{/* <SidebarTrigger className="-ml-1 text-muted-foreground size-5" />
				<Separator orientation="vertical" className="mr-2 h-4" /> */}
				<div className="flex items-center gap-10">
					<_BreadCrumb />
				</div>
				<div className="ml-auto flex items-center gap-2">
					<UserMenu />
				</div>
			</header>
			<LoadingAnime loading={loading} content={content} type="kernalUpdate" />
			<AlertDialogProvider>
				<div
					className={cn(
						"px-4 h-full max-w-[calc(100vw - 10rem - 2em)] max-h-[calc(100vh - 8.5rem - 1px)] overflow-auto flex-1 flex-col space-y-4 md:flex ",
					)}
				>
					<Outlet />
				</div>
				{isShowMonitorPanel && <MonitorDialog />}
			</AlertDialogProvider>
			<Footer />
		</SidebarInset>
	)
}
