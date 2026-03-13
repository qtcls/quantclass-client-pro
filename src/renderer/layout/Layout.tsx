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
import { RealConfigDialog } from "@/renderer/components/RealConfigDialog"
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
import { CapWeightMigrateHandler } from "@/renderer/components/CapWeightMigrateHandler"
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
		<div className="flex flex-col h-screen">
			<WindowsBar toggleFullscreen={toggleFullscreen} />

			<SidebarProvider className="flex-1 min-h-0">
				<Sidebar collapsible="none" className="border-r">
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
			<RealConfigDialog />
			<CapWeightMigrateHandler />
		</div>
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
		<SidebarInset className="h-full overflow-hidden min-w-0 flex flex-col">
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
				<div className={cn("px-4 min-h-0 overflow-auto flex-1")}>
					<Outlet />
				</div>
				{isShowMonitorPanel && <MonitorDialog />}
			</AlertDialogProvider>
			<Footer />
		</SidebarInset>
	)
}
