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
import { useLocalVersions, versionsAtom } from "@/renderer/store/versions"
import type { RepoDownloadRecord } from "@/shared/types/repo"
import { useQuery } from "@tanstack/react-query"
import { useAtomValue } from "jotai"
import { Download, Inbox, Loader2, PackageCheck, Play } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

interface ResearchConfigMasterPageProps {
	className?: string
}

const CONFIG_MASTER_KERNEL = "config-master-stock" as const
const CONFIG_MASTER_WEB_URL = "http://127.0.0.1:9999"

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
}

function ConfigMasterLaunchDialog({
	open,
	onOpenChange,
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
			onSuccess: () => onOpenChange(false),
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
	const [launchOpen, setLaunchOpen] = useState(false)

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
				<div className="flex items-center gap-2 shrink-0">
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

			<div className="flex flex-wrap items-center gap-2 text-sm">
				<Badge variant={hasDownloadedKernel ? "secondary" : "outline"}>
					本地：{currentVersion}
				</Badge>
				{latestVersion ? (
					<Badge variant={hasUpdate ? "outline" : "secondary"}>
						最新：{latestVersion}
					</Badge>
				) : null}
				<Badge variant="outline">回测网页版启动后地址：{CONFIG_MASTER_WEB_URL}</Badge>
				{hasUpdate ? (
					<span className="text-xs text-blue-500">有可用更新</span>
				) : null}
			</div>

			{versionDetail?.description ? (
				<p className="text-sm text-muted-foreground leading-relaxed">
					{versionDetail.description}
				</p>
			) : null}

			<ConfigMasterLaunchDialog open={launchOpen} onOpenChange={setLaunchOpen} />
		</section>
	)
}
