/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { Badge } from "@/renderer/components/ui/badge"
import { Button } from "@/renderer/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { Label } from "@/renderer/components/ui/label"
import {
	RadioGroup,
	RadioGroupItem,
} from "@/renderer/components/ui/radio-group"
import { ScrollArea } from "@/renderer/components/ui/scroll-area"
import { useInvokeUpdateKernal } from "@/renderer/hooks/useInvokeUpdateKernal"
import { cn } from "@/renderer/lib/utils"
import { getKernelStatus } from "@/renderer/page/home/kernel-status"
import { isUpdatingAtom } from "@/renderer/store"
import { monitorProcessesQueryAtom } from "@/renderer/store/query"
import { useLocalVersions, versionsAtom } from "@/renderer/store/versions"
import type { RepoDownloadRecord } from "@/shared/types/repo"
import { useQuery } from "@tanstack/react-query"
import { useAtom, useAtomValue } from "jotai"
import {
	Download,
	ExternalLink,
	Inbox,
	Loader2,
	PackageCheck,
	Play,
	Square,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

interface ResearchConfigMasterPageProps {
	className?: string
}

const CONFIG_MASTER_KERNEL = "config-master-stock" as const
const CONFIG_MASTER_WEB_URL = "http://127.0.0.1:9999"

interface ConfigMasterStatusBarProps {
	currentVersion: string
	latestVersion?: string
	hasDownloadedKernel: boolean
	hasUpdate: boolean
	isServiceRunning: boolean
	onOpenWebpage: () => void
}

function ConfigMasterStatusBar({
	currentVersion,
	latestVersion,
	hasDownloadedKernel,
	hasUpdate,
	isServiceRunning,
	onOpenWebpage,
}: ConfigMasterStatusBarProps) {
	return (
		<div className="rounded-md border bg-muted/20 px-3 py-2.5">
			<div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
				<div className="flex items-center gap-2 min-w-[7.5rem]">
					<span className="relative flex h-2 w-2 shrink-0">
						{isServiceRunning ? (
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
						) : null}
						<span
							className={cn(
								"relative inline-flex h-2 w-2 rounded-full",
								isServiceRunning
									? "bg-green-500 shadow-[0_0_0_3px_rgba(22,163,74,0.2)]"
									: "bg-muted-foreground/30",
							)}
						/>
					</span>
					<span
						className={cn(
							"font-medium",
							isServiceRunning ? "text-green-600" : "text-muted-foreground",
						)}
					>
						{isServiceRunning ? "服务运行中" : "服务未运行"}
					</span>
				</div>

				<div className="hidden h-4 w-px bg-border sm:block" />

				<div className="flex items-center gap-1.5 text-muted-foreground">
					<span>本地内核</span>
					<span
						className={cn(
							"font-mono text-xs",
							hasDownloadedKernel ? "text-foreground" : "text-muted-foreground",
						)}
					>
						{currentVersion}
					</span>
				</div>

				{latestVersion ? (
					<div className="flex items-center gap-1.5 text-muted-foreground">
						<span>最新版本</span>
						<span className="font-mono text-xs text-foreground">
							{latestVersion}
						</span>
						{hasUpdate ? (
							<Badge variant="outline-info" className="px-1.5 py-0 text-[10px]">
								可更新
							</Badge>
						) : null}
					</div>
				) : null}

				<div className="hidden h-4 w-px bg-border sm:block" />

				<button
					type="button"
					className="group flex min-w-0 items-center gap-1.5 text-left text-muted-foreground transition-colors hover:text-foreground"
					onClick={onOpenWebpage}
				>
					<span className="shrink-0">回测地址</span>
					<code className="truncate rounded border bg-background px-1.5 py-0.5 font-mono text-xs text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-50 dark:text-blue-400 dark:group-hover:border-blue-500/30 dark:group-hover:bg-blue-500/10">
						{CONFIG_MASTER_WEB_URL}
					</code>
					<ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
				</button>
			</div>
		</div>
	)
}

export function useLaunchConfigMaster() {
	const [isLaunching, setIsLaunching] = useState(false)

	const launchConfigMaster = async ({
		backtestRoot,
		onSuccess,
	}: {
		backtestRoot?: string
		onSuccess?: () => void
	}) => {
		if (!backtestRoot) {
			toast.warning("请选择一个框架源码版本")
			return
		}

		setIsLaunching(true)
		try {
			const result = await window.electronAPI.launchConfigMaster({
				backtestRoot,
			})
			if (!result.success) {
				toast.error("启动 config 大师失败", { description: result.error })
				return
			}

			toast.success("config 大师已启动")
			onSuccess?.()

			const url = result.url ?? CONFIG_MASTER_WEB_URL
			void window.electronAPI.openUrl(url)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			toast.error("启动 config 大师失败", { description: message })
		} finally {
			setIsLaunching(false)
		}
	}

	return { isLaunching, launchConfigMaster }
}

interface ConfigMasterLaunchDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onLaunched?: () => void
}

function ConfigMasterLaunchDialog({
	open,
	onOpenChange,
	onLaunched,
}: ConfigMasterLaunchDialogProps) {
	const [selectedTicket, setSelectedTicket] = useState<string | null>(null)
	const { isLaunching, launchConfigMaster } = useLaunchConfigMaster()

	const { data: repoRecords } = useQuery<RepoDownloadRecord[]>({
		queryKey: ["repo-records"],
		queryFn: () => window.electronAPI.listRepoRecords(),
		enabled: open,
		staleTime: 1000 * 30,
		refetchOnWindowFocus: false,
	})

	const frameworkRecords = useMemo(
		() =>
			(repoRecords ?? [])
				.filter(
					(record) =>
						record.success &&
						record.apiType === "basic-code" &&
						record.extractDir,
				)
				.sort((a, b) => b.updatedAt - a.updatedAt),
		[repoRecords],
	)

	const firstFrameworkTicket = frameworkRecords[0]?.ticket ?? null

	useEffect(() => {
		if (!open) return
		setSelectedTicket(firstFrameworkTicket)
	}, [open, firstFrameworkTicket])

	const handleLaunch = async () => {
		const frameworkRecord = frameworkRecords.find(
			(record) => record.ticket === selectedTicket,
		)
		await launchConfigMaster({
			backtestRoot: frameworkRecord?.extractDir,
			onSuccess: () => {
				onLaunched?.()
				onOpenChange(false)
			},
		})
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>选择框架源码</DialogTitle>
					<DialogDescription>
						选择一个本地已下载的框架源码版本，作为 config 大师的回测根目录
					</DialogDescription>
				</DialogHeader>

				{frameworkRecords.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
						<Inbox className="h-8 w-8 opacity-50" />
						<span>暂无已下载的框架源码，请先在下方下载框架源码</span>
					</div>
				) : (
					<ScrollArea className="max-h-72 pr-3">
						<RadioGroup
							value={selectedTicket ?? undefined}
							onValueChange={setSelectedTicket}
							className="space-y-2"
						>
							{frameworkRecords.map((record) => (
								<div
									key={record.ticket}
									className="flex items-start gap-3 rounded-lg border p-3"
								>
									<RadioGroupItem
										value={record.ticket}
										id={`framework-${record.ticket}`}
										className="mt-1"
									/>
									<Label
										htmlFor={`framework-${record.ticket}`}
										className="min-w-0 flex-1 cursor-pointer space-y-1 font-normal"
									>
										<div className="font-medium">{record.versionName}</div>
										<div className="text-xs text-muted-foreground truncate">
											{record.itemTitle}
										</div>
										<div className="text-xs text-muted-foreground font-mono truncate">
											{record.extractDir}
										</div>
									</Label>
								</div>
							))}
						</RadioGroup>
					</ScrollArea>
				)}

				<DialogFooter>
					<Button
						variant="outline"
						disabled={isLaunching}
						onClick={() => onOpenChange(false)}
					>
						取消
					</Button>
					<Button
						disabled={!selectedTicket || isLaunching}
						onClick={handleLaunch}
					>
						{isLaunching ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							"启动"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export default function ResearchConfigMasterPage({
	className,
}: ResearchConfigMasterPageProps) {
	const versions = useAtomValue(versionsAtom)
	const { refetchLocalVersions } = useLocalVersions()
	const invokeUpdateKernal = useInvokeUpdateKernal()
	const [isUpdating, setIsUpdating] = useState(false)
	const [isStopping, setIsStopping] = useState(false)
	const [launchOpen, setLaunchOpen] = useState(false)
	const isGlobalUpdating = useAtomValue(isUpdatingAtom)
	const [{ data: monitorProcesses, refetch: refetchMonitorProcesses }] =
		useAtom(monitorProcessesQueryAtom)

	const isServiceRunning =
		getKernelStatus(
			CONFIG_MASTER_KERNEL,
			monitorProcesses,
			isGlobalUpdating,
			false,
		).level === "ok"

	const { data: appVersions, refetch: refetchAppVersions } = useQuery({
		queryKey: ["app-versions"],
		queryFn: () => window.electronAPI.checkUpdate(true),
		staleTime: 1000 * 60 * 5,
		refetchOnWindowFocus: false,
	})

	const currentVersion = versions.configMasterStockVersion ?? "暂无内核"
	const latestVersion = appVersions?.latest?.[CONFIG_MASTER_KERNEL]
	// 仅用于展示下载状态与文案；启动入口不依赖这个状态，允许用户手动放入内核目录后直接启动。
	const hasDownloadedKernel = currentVersion !== "暂无内核"
	const hasUpdate = Boolean(latestVersion && latestVersion !== currentVersion)
	const versionDetail = useMemo(
		() =>
			appVersions?.[CONFIG_MASTER_KERNEL]?.find(
				(version) => version.version === latestVersion,
			),
		[appVersions, latestVersion],
	)

	const handleUpdate = async () => {
		setIsUpdating(true)
		try {
			await refetchAppVersions()
			await invokeUpdateKernal(CONFIG_MASTER_KERNEL)
			await refetchLocalVersions()
		} finally {
			setIsUpdating(false)
		}
	}

	const handleOpenWebpage = () => {
		void window.electronAPI.openUrl(CONFIG_MASTER_WEB_URL)
	}

	const handleStopService = async () => {
		setIsStopping(true)
		try {
			await window.electronAPI.killKernal(CONFIG_MASTER_KERNEL, true)
			await refetchMonitorProcesses()
			toast.success("config 大师服务已停止")
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			toast.error("停止 config 大师失败", { description: message })
		} finally {
			setIsStopping(false)
		}
	}

	return (
		<section
			className={cn(
				"rounded-lg border bg-card p-4 shadow-sm space-y-4",
				className,
			)}
		>
			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0 space-y-1">
					<div className="flex items-center gap-2">
						<PackageCheck className="h-5 w-5 text-muted-foreground" />
						<h2 className="font-semibold text-xl">config 大师</h2>
					</div>
					<p className="text-sm text-muted-foreground">
						下载并管理 config 大师内核；点击「启动」后选择本地框架源码版本即可运行。
					</p>
				</div>
				<div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
					<Button
						type="button"
						className="h-10 gap-1.5"
						onClick={() => setLaunchOpen(true)}
					>
						<Play className="h-4 w-4" />
						启动 config 大师
					</Button>
					<Button
						type="button"
						variant="outline"
						className="h-10 gap-1.5"
						onClick={handleOpenWebpage}
					>
						<ExternalLink className="h-4 w-4" />
						打开网页
					</Button>
					<Button
						type="button"
						variant="outline"
						className="h-10 gap-1.5"
						disabled={!isServiceRunning || isStopping}
						onClick={handleStopService}
					>
						{isStopping ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Square className="h-4 w-4" />
						)}
						停止服务
					</Button>
					<Button
						type="button"
						variant="outline"
						className="h-10 gap-1.5"
						disabled={isUpdating}
						onClick={handleUpdate}
					>
						{isUpdating ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Download className="h-4 w-4" />
						)}
						{hasDownloadedKernel ? "更新 config 大师" : "下载 config 大师"}
					</Button>
				</div>
			</div>

			<ConfigMasterStatusBar
				currentVersion={currentVersion}
				latestVersion={latestVersion}
				hasDownloadedKernel={hasDownloadedKernel}
				hasUpdate={hasUpdate}
				isServiceRunning={isServiceRunning}
				onOpenWebpage={handleOpenWebpage}
			/>

			{versionDetail?.description ? (
				<p className="text-sm text-muted-foreground leading-relaxed">
					{versionDetail.description}
				</p>
			) : null}

			<ConfigMasterLaunchDialog
				open={launchOpen}
				onOpenChange={setLaunchOpen}
				onLaunched={() => void refetchMonitorProcesses()}
			/>
		</section>
	)
}
