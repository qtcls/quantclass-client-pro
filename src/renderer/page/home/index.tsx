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
	ProcessHoverCard,
	ProcessHoverCardContent,
	ProcessHoverCardTrigger,
} from "@/renderer/components/ui/process-monitor-hover-card"
import { Separator } from "@/renderer/components/ui/separator"
import { cn } from "@/renderer/lib/utils"
import { DataKanban } from "@/renderer/page/home/DataKanban"
import { ProcessCard, ProcessKanban } from "@/renderer/page/home/ProcessKanban"
import { RealMarketKanban } from "@/renderer/page/home/RealMarketKanban"
import { KernalUpdateStatus } from "@/renderer/page/home/kernal-update-status"
import { SelfStarting } from "@/renderer/page/settings/preview"
import { isAutoRocketAtom, isUpdatingAtom } from "@/renderer/store"
import { monitorProcessesQueryAtom } from "@/renderer/store/query"
import { useAtom, useAtomValue } from "jotai"

import { useAlertDialog } from "@/renderer/context/alert-dialog"
import ScheduleControl from "@/renderer/page/home/schedule"
import { libraryTypeAtom } from "@/renderer/store/storage"
import { type FC, useEffect } from "react"
import { ABOUT_CLIENT_VER, AboutPage } from "../settings/about"

const { getStoreValue, setStoreValue, closeApp } = window.electronAPI
const Home: FC = () => {
	const useAlert = useAlertDialog()
	useEffect(() => {
		const aboutKey = `app.alert.${ABOUT_CLIENT_VER}`
		getStoreValue(aboutKey, "").then((value) => {
			if (value === "") {
				useAlert.open({
					title: "关于客户端及使用逻辑",
					content: <AboutPage />,
					okText: "我已充分了解",
					isContentLong: true,
					disableClose: true,
					onOk: () => {
						setStoreValue(aboutKey, `${Date.now()}`)
					},
					onCancel: () => {
						closeApp()
					},
					okDelay: 20,
					cancelText: "退出客户端",
					size: "xl",
				})
			}
		})
	}, [])
	return (
		<div className="h-full flex py-3 gap-4">
			{/* <div className={cn("grid gap-4 grid-cols-[1fr_2px_1fr]")}> */}
			<div className="space-y-4 max-w-md min-w-[350px] flex-shrink-0">
				<DataKanban />
				<Separator />
				<ProcessKanban />
			</div>
			<div className="flex-1 min-w-0 space-y-4">
				<RealMarketKanban />
				<Separator />
				<ScheduleControl />
				<Separator />
				<SelfStarting />
			</div>
		</div>
	)
}

export const KernalVersionDes = ({
	className,
	layout = "vertical",
}: {
	className?: string
	textSize?: "sm" | "base"
	layout?: "horizontal" | "vertical"
}) => {
	const [{ data }] = useAtom(monitorProcessesQueryAtom)
	const isUpdating = useAtomValue(isUpdatingAtom) // -- 获取内核是否自动更新
	const isAutoRocket = useAtomValue(isAutoRocketAtom) // -- 获取是否自动实盘
	const libraryType = useAtomValue(libraryTypeAtom)
	const baseStatusList = [
		{
			label: "数据模块",
			Key: "fuel",
		},
		{
			label: "选股模块",
			Key: "aqua",
		},
		{
			label: "高级选股模块",
			Key: "zeus",
		},
		{ label: "下单模块", Key: "rocket" },
	] as const
	// 根据 libraryType 动态调整 statusList
	const getStatusList = () => {
		return baseStatusList.filter(
			(item) => item.Key !== (libraryType === "pos" ? "aqua" : "zeus"),
		)
	}
	const statusList = getStatusList()
	const getStatusColor = (key: (typeof statusList)[number]["Key"]) => {
		if (data?.some((v) => v.kernel === key)) return "🟢"
		if (isUpdating && key === "fuel") return "🟡"
		if (isAutoRocket && (key === "aqua" || key === "zeus" || key === "rocket"))
			return "🟡"
		return "⚪" // 默认状态
	}

	return (
		<>
			<div
				className={cn(
					`flex ${layout === "vertical" && "flex-col"} gap-0.5 ${className}`,
				)}
			>
				<div className="flex items-center gap-3">
					{statusList.map((item, index) => (
						<ProcessHoverCard key={index}>
							<ProcessHoverCardTrigger>
								<div className="flex items-center gap-1">
									{item.label}: {getStatusColor(item.Key)}
								</div>
							</ProcessHoverCardTrigger>
							<ProcessHoverCardContent>
								<ProcessCard data={data} kernel={item.Key} />
							</ProcessHoverCardContent>
						</ProcessHoverCard>
					))}
					{isUpdating && <KernalUpdateStatus />}
				</div>
			</div>
		</>
	)
}

export default Home
