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
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/renderer/components/ui/card"
import { H3 } from "@/renderer/components/ui/typography"
// import { H3 } from "@/renderer/components/ui/typography"
import { isWindows } from "@/renderer/constant"
import { isAutoRocketAtom, isUpdatingAtom } from "@/renderer/store"
import { monitorProcessesQueryAtom } from "@/renderer/store/query"
import { libraryTypeAtom } from "@/renderer/store/storage"
import { userAtom } from "@/renderer/store/user"
import dayjs from "dayjs"
import { useAtom, useAtomValue } from "jotai"
import {
	Activity,
	CircleSlash,
	History,
	Loader2,
	MonitorPlay,
} from "lucide-react"
import { useRef } from "react"
import { useMemo } from "react"

export const ProcessKanban = () => {
	const { isMember } = useAtomValue(userAtom)
	const [{ data }] = useAtom(monitorProcessesQueryAtom)
	const libraryType = useAtomValue(libraryTypeAtom)

	const { VITE_XBX_ENV } = import.meta.env

	// 实盘交易权限检查
	const canRealTrading =
		VITE_XBX_ENV === "development" ||
		(isMember && isWindows && VITE_XBX_ENV === "production")

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-col gap-1 items-start">
				<div className="flex items-center gap-2">
					<MonitorPlay size={26} />
					<H3>进程监控</H3>
				</div>
				<p className="text-sm text-muted-foreground">监控内核运行状态</p>
			</div>

			<div className="grid  gap-2">
				<ProcessCard data={data} kernel="fuel" />
				{canRealTrading && isMember && (
					<ProcessCard
						data={data}
						kernel={libraryType === "pos" ? "zeus" : "aqua"}
					/>
				)}
				{canRealTrading && isMember && (
					<ProcessCard data={data} kernel="rocket" />
				)}
			</div>
		</div>
	)
}

export const ProcessCard = ({
	data,
	kernel,
}: {
	kernel: "fuel" | "aqua" | "rocket" | "zeus"
	data?: {
		pid: number
		action: string
		kernel: "fuel" | "aqua" | "rocket" | "zeus"
		createdAt: string
	}[]
}) => {
	const isUpdating = useAtomValue(isUpdatingAtom) // -- 获取内核是否自动更新
	const isAutoRocket = useAtomValue(isAutoRocketAtom) // -- 获取是否自动实盘
	// -- 使用 useRef 持久化存储最后运行时间
	const lastRunTimeRef = useRef<string | null>(null)

	const keyMap = {
		fuel: "数据模块",
		aqua: "选股模块",
		zeus: "高级选股模块",
		rocket: "下单模块",
	}
	const actionMap = {
		fuel: "运行中...",
		aqua: "计算中...",
		rocket: "运行中...",
	}
	const timeMap = {
		fuel: "上次更新时间",
		aqua: "上次选股时间",
		rocket: "上次运行时间",
	}

	// 获取是否正在运行
	const isRunning = useMemo(() => {
		return data?.some((item) => item.kernel === kernel) || false
	}, [data, kernel])

	// -- 获取最新的进程信息并更新 lastRunTimeRef
	const latestProcess = data
		?.filter((item) => item.kernel === kernel)
		?.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		)?.[0]

	// -- 如果有新的时间记录则更新 ref
	if (latestProcess?.createdAt) {
		lastRunTimeRef.current = latestProcess.createdAt
	}

	// 获取是否启动fuel或者aqua或者rocket
	const isInitializing = useMemo(() => {
		return (
			(isUpdating && kernel === "fuel") ||
			(isAutoRocket &&
				(kernel === "aqua" || kernel === "zeus" || kernel === "rocket"))
		)
	}, [isUpdating, isAutoRocket, kernel])

	// 获取动画颜色
	const getStatusColor = useMemo(() => {
		if (isRunning) return "bg-green-500"
		if (isInitializing) return "bg-yellow-500"
		return "bg-gray-300"
	}, [isRunning, isInitializing])

	// 获取运行状态
	const getAction = useMemo(() => {
		if (isRunning) {
			return (
				<div className="flex items-center gap-1">
					<Loader2 className="w-4 h-4 text-success animate-spin" />
					<span>{actionMap[kernel]}</span>
				</div>
			)
		}

		if (isInitializing) {
			return (
				<div className="flex items-center gap-1">
					<CircleSlash className="w-4 h-4 text-warning" />
					<span>已配置，等待运行...</span>
				</div>
			)
		}

		return (
			<div className="flex items-center gap-1">
				<span>🚫</span>
				<span>未启用</span>
			</div>
		)
	}, [isRunning, isInitializing, kernel])
	return (
		<Card className="relative">
			<div className="absolute right-4 top-4 h-3 w-3">
				{isRunning ? (
					<>
						<div
							className={`absolute h-full w-full rounded-full opacity-75 ${getStatusColor} animate-ping`}
						/>
						<div
							className={`absolute h-full w-full rounded-full ${getStatusColor}`}
						/>
					</>
				) : (
					<div className={`h-full w-full rounded-full ${getStatusColor}`} />
				)}
			</div>

			<CardHeader>
				<CardTitle>{keyMap[kernel]}</CardTitle>
			</CardHeader>

			<CardContent className="flex flex-col gap-2 text-sm">
				<div className="flex items-center gap-1">
					<Activity className="w-4 h-4" />
					<span>运行状态：</span>
					{getAction}
				</div>
				<div className="flex items-center gap-1">
					<History className="w-4 h-4" />
					{timeMap[kernel]}：
					{lastRunTimeRef.current
						? dayjs(lastRunTimeRef.current).format("HH:mm:ss")
						: "--:--"}
				</div>
			</CardContent>
		</Card>
	)
}
