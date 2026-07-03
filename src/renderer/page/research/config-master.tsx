/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

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
import { ResearchCenterPage } from "@/renderer/page/research"
import type { RepoDownloadRecord } from "@/shared/types/repo"
import { Loader2, Play } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

interface ResearchConfigMasterPageProps {
	className?: string
}

export const CONFIG_MASTER_ITEM_ID = "697711a6e639c91abdc76e92"

export function useLaunchConfigMaster() {
	const [isLaunching, setIsLaunching] = useState(false)

	const launchConfigMaster = async ({
		configMasterRoot,
		backtestRoot,
		onSuccess,
	}: {
		configMasterRoot?: string
		backtestRoot?: string
		onSuccess?: () => void
	}) => {
		if (!configMasterRoot) {
			toast.error("请先下载 config 大师")
			return
		}
		if (!backtestRoot) {
			toast.warning("请选择一个框架源码版本")
			return
		}

		setIsLaunching(true)
		try {
			const result = await window.electronAPI.launchConfigMaster({
				configMasterRoot,
				backtestRoot,
			})
			if (!result.success) {
				toast.error("启动 config 大师失败", { description: result.error })
				return
			}

			toast.success("config 大师已启动")
			onSuccess?.()

			const url = result.url ?? "http://127.0.0.1:9999"
			window.setTimeout(() => {
				void window.electronAPI.openUrl(url)
			}, 1500)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			toast.error("启动 config 大师失败", { description: message })
		} finally {
			setIsLaunching(false)
		}
	}

	return { isLaunching, launchConfigMaster }
}

interface ConfigMasterLaunchActionProps {
	repoRecords: RepoDownloadRecord[] | undefined
	localRecords: RepoDownloadRecord[]
}

function ConfigMasterLaunchAction({
	repoRecords,
	localRecords,
}: ConfigMasterLaunchActionProps) {
	const [dialogOpen, setDialogOpen] = useState(false)
	const [selectedTicket, setSelectedTicket] = useState<string | null>(null)
	const { isLaunching, launchConfigMaster } = useLaunchConfigMaster()

	const configMasterRecord = localRecords[0]

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
		if (!dialogOpen) return
		setSelectedTicket(firstFrameworkTicket)
	}, [dialogOpen, firstFrameworkTicket])

	const handleOpenDialog = () => {
		if (!configMasterRecord?.extractDir) {
			toast.error("请先下载 config 大师")
			return
		}
		if (frameworkRecords.length === 0) {
			toast.error("请先在框架源码中下载一个版本")
			return
		}
		setDialogOpen(true)
	}

	const handleLaunch = async () => {
		const frameworkRecord = frameworkRecords.find(
			(record) => record.ticket === selectedTicket,
		)
		await launchConfigMaster({
			configMasterRoot: configMasterRecord?.extractDir,
			backtestRoot: frameworkRecord?.extractDir,
			onSuccess: () => setDialogOpen(false),
		})
	}

	return (
		<>
			<Button
				type="button"
				variant="outline"
				className="h-10 gap-1.5"
				onClick={handleOpenDialog}
			>
				<Play className="h-4 w-4" />
				启动 config 大师
			</Button>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>选择框架源码</DialogTitle>
						<DialogDescription>
							选择一个本地已下载的框架源码版本，作为 config 大师的回测根目录
						</DialogDescription>
					</DialogHeader>

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

					<DialogFooter>
						<Button
							variant="outline"
							disabled={isLaunching}
							onClick={() => setDialogOpen(false)}
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
		</>
	)
}

export default function ResearchConfigMasterPage({
	className,
}: ResearchConfigMasterPageProps) {
	return (
		<ResearchCenterPage
			apiType="config-master"
			className={className}
			title="config 大师"
			description="管理本地已下载的 config 大师，或下载最新版本"
			downloadActionLabel="下载 config 大师"
			directDownloadConfig={{
				courseName: "fen-2026",
				itemId: CONFIG_MASTER_ITEM_ID,
				overwrite: true,
			}}
			extraActions={({ repoRecords, localRecords }) => (
				<ConfigMasterLaunchAction
					repoRecords={repoRecords}
					localRecords={localRecords}
				/>
			)}
		/>
	)
}
