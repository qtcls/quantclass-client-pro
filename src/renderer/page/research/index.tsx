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
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/renderer/components/ui/alert-dialog"
import { Badge } from "@/renderer/components/ui/badge"
import { Button } from "@/renderer/components/ui/button"
import ButtonTooltip from "@/renderer/components/ui/button-tooltip"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { Input } from "@/renderer/components/ui/input"
import { ScrollArea } from "@/renderer/components/ui/scroll-area"
import { Spinner } from "@/renderer/components/ui/spinner"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/renderer/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/renderer/components/ui/tabs"
import { H2 } from "@/renderer/components/ui/typography"
import { useResearchDownload } from "@/renderer/hooks/useResearchDownload"
import { useSettings } from "@/renderer/hooks/useSettings"
import { cn } from "@/renderer/lib/utils"
import { getResearchBasicCode, getResearchStrategies } from "@/renderer/request"
import { userAtom } from "@/renderer/store/user"
import type {
	ResearchItem,
	ResearchVersion,
	ResearchVersionFile,
} from "@/renderer/types/research"
import { isBaseFolderName } from "@/shared/lib/repo-folder"
import type { RepoApiType, RepoDownloadRecord } from "@/shared/types/repo"
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useAtomValue } from "jotai"
import {
	ChevronDown,
	Download,
	FolderOpen,
	Inbox,
	Loader2,
	Lock,
	RefreshCw,
	Trash2,
} from "lucide-react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import { toast } from "sonner"
import { ResearchRedownloadConfirmDialog } from "./redownload-confirm-dialog"

export interface ResearchCenterPageProps {
	apiType: RepoApiType
	title: string
	description?: string
}

const YEAR_OPTIONS = ["fen-2026", "fen-2025", "fen-2024", "fen-2023"] as const
type YearOption = (typeof YEAR_OPTIONS)[number]

const YEAR_LABEL_MAP: Record<YearOption, string> = {
	"fen-2026": "2026 分享会",
	"fen-2025": "2025 分享会",
	"fen-2024": "2024 分享会",
	"fen-2023": "2023 分享会",
}

const API_FN_MAP = {
	strategies: getResearchStrategies,
	"basic-code": getResearchBasicCode,
}

const DOWNLOAD_DIR_BY_API_TYPE: Record<RepoApiType, string> = {
	strategies: "strategy_repo",
	"basic-code": "framework_repo",
}

const DOWNLOAD_ACTION_LABEL: Record<RepoApiType, string> = {
	strategies: "下载策略",
	"basic-code": "下载框架",
}

const VERSION_DESCRIPTION_MARKDOWN_CLASS =
	"prose prose-sm dark:prose-invert max-w-none text-sm leading-6 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_hr]:my-2 [&_p]:my-1"

const VERSION_DESCRIPTION_COLLAPSED_HEIGHT = "max-h-24"

function getVersionTimestamp(version: ResearchVersion): number {
	if (!version.time) return 0
	const ts = Date.parse(version.time.replace(" ", "T"))
	return Number.isNaN(ts) ? 0 : ts
}

function sortVersionsByTimeDesc(
	versions: ResearchVersion[],
): ResearchVersion[] {
	return versions
		.map((version, index) => ({ version, index }))
		.sort((a, b) => {
			const diff =
				getVersionTimestamp(b.version) - getVersionTimestamp(a.version)
			return diff !== 0 ? diff : a.index - b.index
		})
		.map(({ version }) => version)
}

function hasBaseFolderSuccess(
	records: RepoDownloadRecord[] | undefined,
	fid: string,
	versionName: string,
): boolean {
	if (!fid || !versionName) return false
	return (records ?? []).some(
		(r) => r.success && r.fid === fid && r.versionName === versionName,
	)
}

function getExtraPermissions(file: ResearchVersionFile | undefined): string[] {
	const raw = file?.extra_permissions
	if (!Array.isArray(raw)) return []
	return raw.filter((p): p is string => typeof p === "string")
}

function hasDownloadPermission(
	extraPermissions: string[],
	userPermissions: string[],
): boolean {
	if (extraPermissions.length === 0) return true
	return extraPermissions.every((p) => userPermissions.includes(p))
}

function getCourseLabel(courseName: string): string {
	return YEAR_LABEL_MAP[courseName as YearOption] ?? courseName
}

function formatDownloadTime(timestamp: number): string {
	if (!timestamp) return ""
	return dayjs(timestamp).format("YYYY-MM-DD HH:mm")
}

function formatRemoteUpdatedAt(value?: string): string {
	if (!value?.trim()) return "--:--:--"
	return value.trim()
}

function formatLocalUpdatedAt(timestamp: number): string {
	if (!timestamp) return "--:--:--"
	return formatDownloadTime(timestamp)
}

function buildRemoteUpdatedAtByFid(
	results: Array<{ code?: number; data?: ResearchItem[] } | undefined>,
): Map<string, string> {
	const map = new Map<string, string>()
	for (const res of results) {
		const items =
			res?.code === 200 && Array.isArray(res.data) ? res.data : []
		for (const item of items) {
			for (const version of item.versions ?? []) {
				const fid = version.file?.id
				if (!fid) continue
				const time =
					version.time || version.file?.ut || version.file?.ct || ""
				if (time) map.set(fid, time)
			}
		}
	}
	return map
}

export function ResearchCenterPage({
	apiType,
	title,
	description,
}: ResearchCenterPageProps) {
	const [downloadOpen, setDownloadOpen] = useState(false)
	const { permissions } = useAtomValue(userAtom)
	const { dataLocation } = useSettings()
	const downloadSubDir = DOWNLOAD_DIR_BY_API_TYPE[apiType]
	const downloadActionLabel = DOWNLOAD_ACTION_LABEL[apiType]
	const downloadPath = dataLocation
		? `${dataLocation.replace(/\\/g, "/").replace(/\/$/, "")}/${downloadSubDir}`
		: `存储路径/${downloadSubDir}`

	const { data: repoRecords, isLoading: isRecordsLoading } = useQuery<
		RepoDownloadRecord[]
	>({
		queryKey: ["repo-records"],
		queryFn: () => window.electronAPI.listRepoRecords(),
		staleTime: 1000 * 30,
		refetchOnWindowFocus: false,
	})

	const localRecords = useMemo(
		() =>
			(repoRecords ?? [])
				.filter((r) => r.success && r.apiType === apiType && r.folderName)
				.sort((a, b) => b.updatedAt - a.updatedAt),
		[repoRecords, apiType],
	)

	const handleOpenDownloadFolder = async () => {
		if (!dataLocation) {
			toast.warning("请先在设置中配置数据存储路径")
			return
		}
		await window.electronAPI.openDataDirectory(downloadSubDir)
	}

	const handleOpenRecordFolder = async (record: RepoDownloadRecord) => {
		if (record.extractDir) {
			await window.electronAPI.openDirectory([record.extractDir])
			return
		}
		await handleOpenDownloadFolder()
	}

	return (
		<div className="h-full flex-1 flex-col space-y-4 md:flex pt-3">
			<div className="w-full space-y-3">
				<div className="min-w-0">
					<H2>{title}</H2>
					{description ? (
						<p className="text-muted-foreground mt-1">{description}</p>
					) : null}
				</div>
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-2 shrink-0">
						<Button
							className="h-10 gap-1.5"
							onClick={() => setDownloadOpen(true)}
						>
							<Download className="h-4 w-4" />
							{downloadActionLabel}
						</Button>
						<Button
							type="button"
							variant="outline"
							className="h-10 gap-1.5"
							onClick={handleOpenDownloadFolder}
						>
							<FolderOpen className="h-4 w-4" />
							打开文件夹
						</Button>
					</div>
					<Input
						readOnly
						value={downloadPath}
						className="bg-background h-10 w-80 shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground"
						placeholder="请先在设置中配置数据存储路径"
					/>
				</div>
			</div>

			<div className="flex-1 min-h-0">
				{isRecordsLoading ? (
					<div className="flex items-center justify-center h-64">
						<Spinner size="large">
							<span className="mt-3 text-sm text-muted-foreground">
								加载本地记录...
							</span>
						</Spinner>
					</div>
				) : localRecords.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-64 gap-3 text-sm text-muted-foreground">
						<Inbox className="w-10 h-10 opacity-50" />
						<span>暂无已下载版本</span>
					</div>
				) : (
					<LocalRecordsTable
						apiType={apiType}
						records={localRecords}
						onOpenFolder={handleOpenRecordFolder}
					/>
				)}
			</div>

			<DownloadVersionsDialog
				open={downloadOpen}
				onOpenChange={setDownloadOpen}
				apiType={apiType}
				dialogTitle={downloadActionLabel}
				repoRecords={repoRecords}
				userPermissions={permissions}
			/>
		</div>
	)
}

interface LocalRecordsTableProps {
	apiType: RepoApiType
	records: RepoDownloadRecord[]
	onOpenFolder: (record: RepoDownloadRecord) => void
}

function LocalRecordsTable({
	apiType,
	records,
	onOpenFolder,
}: LocalRecordsTableProps) {
	const queryClient = useQueryClient()
	const [deleteRecord, setDeleteRecord] = useState<RepoDownloadRecord | null>(
		null,
	)
	const [isDeleting, setIsDeleting] = useState(false)

	const courseYears = useMemo(() => {
		const years = [
			...new Set(records.map((record) => record.courseName).filter(Boolean)),
		]
		return years.filter((year): year is YearOption =>
			YEAR_OPTIONS.includes(year as YearOption),
		)
	}, [records])

	const remoteQueries = useQueries({
		queries: courseYears.map((year) => ({
			queryKey: ["research-center", apiType, year],
			queryFn: () => API_FN_MAP[apiType](year),
			staleTime: 1000 * 60 * 5,
			refetchOnWindowFocus: false,
		})),
	})

	const remoteUpdatedAtByFid = useMemo(
		() => buildRemoteUpdatedAtByFid(remoteQueries.map((query) => query.data)),
		[remoteQueries],
	)

	const handleDelete = async () => {
		if (!deleteRecord) return
		setIsDeleting(true)
		try {
			const result = await window.electronAPI.deleteRepoDownload(
				deleteRecord.ticket,
			)
			if (result.success) {
				setDeleteRecord(null)
				toast.success("已删除")
				queryClient.invalidateQueries({ queryKey: ["repo-records"] })
			} else {
				toast.error("删除失败", { description: result.error })
			}
		} finally {
			setIsDeleting(false)
		}
	}

	return (
		<>
			<div className="rounded-lg border bg-card overflow-hidden">
				<Table
					containerClassname="max-w-none"
					containerStyle={{ maxWidth: "100%" }}
				>
					<TableHeader>
						<TableRow className="hover:bg-transparent border-b bg-muted/30">
							<TableHead className="pl-4 h-11 min-w-[12rem]">版本</TableHead>
							<TableHead className="h-11 min-w-[10rem]">名称</TableHead>
							<TableHead className="h-11 whitespace-nowrap w-[7.5rem]">
								分享会
							</TableHead>
							<TableHead className="h-11 whitespace-nowrap w-[11rem]">
								更新时间
							</TableHead>
							<TableHead className="h-11 w-[5.5rem]">操作</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{records.map((record) => (
							<LocalRecordTableRow
								key={record.ticket}
								record={record}
								remoteUpdatedAt={remoteUpdatedAtByFid.get(record.fid)}
								onOpenFolder={() => onOpenFolder(record)}
								onDelete={() => setDeleteRecord(record)}
							/>
						))}
					</TableBody>
				</Table>
			</div>

			<AlertDialog
				open={!!deleteRecord}
				onOpenChange={(open) => {
					if (!open) setDeleteRecord(null)
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>确认删除</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-2 text-sm text-muted-foreground">
								<p>
									将删除本地文件夹「
									<span className="text-foreground font-medium break-all">
										{deleteRecord?.folderName}
									</span>
									」，并移除下载记录。此操作不可撤销。
								</p>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
						<Button
							variant="destructive"
							disabled={isDeleting}
							onClick={handleDelete}
						>
							{isDeleting ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								"删除"
							)}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

interface LocalRecordTableRowProps {
	record: RepoDownloadRecord
	remoteUpdatedAt?: string
	onOpenFolder: () => void
	onDelete: () => void
}

function LocalRecordTableRow({
	record,
	remoteUpdatedAt,
	onOpenFolder,
	onDelete,
}: LocalRecordTableRowProps) {
	return (
		<TableRow className="group">
			<TableCell className="pl-4 py-3 align-middle max-w-[15rem]">
				<div className="space-y-0.5">
					<ButtonTooltip content={record.versionName}>
						<span className="block truncate text-muted-foreground">
							{record.versionName}
						</span>
					</ButtonTooltip>
					{!isBaseFolderName(record.folderName, record.link) ? (
						<ButtonTooltip content={record.folderName}>
							<span className="block truncate font-mono text-xs text-muted-foreground/80">
								{record.folderName}
							</span>
						</ButtonTooltip>
					) : null}
				</div>
			</TableCell>
			<TableCell className="py-3 align-middle max-w-[14rem]">
				<ButtonTooltip content={record.itemTitle}>
					<span className="block truncate font-medium">{record.itemTitle}</span>
				</ButtonTooltip>
			</TableCell>
			<TableCell className="py-3 align-middle">
				<Badge variant="secondary" className="text-xs font-normal">
					{getCourseLabel(record.courseName)}
				</Badge>
			</TableCell>
			<TableCell className="py-3 align-middle">
				<ButtonTooltip
					content={
						<div className="space-y-1 text-xs leading-relaxed">
							<p>
								<strong>云端：</strong>
								服务器上该版本的更新时间。
							</p>
							<p>
								<strong>本地：</strong>
								客户端下载该版本到本地的时间。
							</p>
						</div>
					}
					delayDuration={0}
				>
					<div className="text-xs text-muted-foreground text-nowrap rounded-md p-0.5 hover:bg-muted/60 cursor-default">
						<div>云端：{formatRemoteUpdatedAt(remoteUpdatedAt)}</div>
						<div>本地：{formatLocalUpdatedAt(record.updatedAt)}</div>
					</div>
				</ButtonTooltip>
			</TableCell>
			<TableCell className="py-3 align-middle">
				<div className="flex items-center gap-1">
					<ButtonTooltip content="打开文件夹">
						<Button
							size="icon"
							variant="outline"
							className="h-8 w-8"
							onClick={onOpenFolder}
						>
							<FolderOpen className="h-4 w-4" />
						</Button>
					</ButtonTooltip>
					<ButtonTooltip content="删除">
						<Button
							size="icon"
							variant="outline"
							className="h-8 w-8 text-destructive hover:text-destructive"
							onClick={onDelete}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</ButtonTooltip>
				</div>
			</TableCell>
		</TableRow>
	)
}

interface DownloadVersionsDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	apiType: RepoApiType
	dialogTitle: string
	repoRecords: RepoDownloadRecord[] | undefined
	userPermissions: string[]
}

function DownloadVersionsDialog({
	open,
	onOpenChange,
	apiType,
	dialogTitle,
	repoRecords,
	userPermissions,
}: DownloadVersionsDialogProps) {
	const [activeYear, setActiveYear] = useState<YearOption>(YEAR_OPTIONS[0])
	const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

	const { data, isLoading, isFetching, isError, error } = useQuery({
		queryKey: ["research-center", apiType, activeYear],
		queryFn: async () => {
			const res = await API_FN_MAP[apiType](activeYear)
			return res
		},
		enabled: open,
		staleTime: 1000 * 60 * 5,
		refetchOnWindowFocus: false,
	})

	const items: ResearchItem[] =
		data?.code === 200 && Array.isArray(data.data) ? data.data : []

	const selectedItem =
		items.find((item) => item.id === selectedItemId) ?? items[0] ?? null

	const firstItemId = items[0]?.id ?? null

	useEffect(() => {
		if (!open) return
		setSelectedItemId(firstItemId)
	}, [open, firstItemId])

	const sortedVersions = selectedItem
		? sortVersionsByTimeDesc(selectedItem.versions)
		: []
	const latestVersion = sortedVersions[0]
	const historyVersions = sortedVersions.slice(1)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
				<DialogHeader className="p-6 pb-4 shrink-0">
					<DialogTitle>{dialogTitle}</DialogTitle>
					<DialogDescription>
						选择框架与版本，下载到本地策略库目录
					</DialogDescription>
				</DialogHeader>

				<div className="px-6 pb-3 shrink-0 flex items-center justify-between gap-3">
					<Tabs
						value={activeYear}
						onValueChange={(v) => setActiveYear(v as YearOption)}
					>
						<TabsList>
							{YEAR_OPTIONS.map((y) => (
								<TabsTrigger key={y} value={y}>
									{YEAR_LABEL_MAP[y]}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
					{isFetching && !isLoading ? (
						<span className="text-xs text-muted-foreground">刷新中...</span>
					) : null}
				</div>

				<div className="flex flex-1 min-h-0 border-t">
					<ScrollArea className="w-56 shrink-0 border-r">
						<div className="p-2 space-y-1">
							{isLoading ? (
								<div className="flex justify-center py-8">
									<Spinner size="small" />
								</div>
							) : isError ? (
								<p className="text-xs text-muted-foreground px-2 py-4">
									加载失败：{(error as Error)?.message ?? "未知错误"}
								</p>
							) : items.length === 0 ? (
								<div className="flex flex-col items-center gap-2 py-8 px-2 text-xs text-muted-foreground text-center">
									<Lock className="w-6 h-6 opacity-50" />
									<span>购买后可查看课程内容</span>
								</div>
							) : (
								items.map((item) => (
									<button
										key={item.id}
										type="button"
										className={cn(
											"w-full text-left rounded-md px-3 py-2.5 text-sm transition-colors",
											selectedItem?.id === item.id
												? "bg-accent text-accent-foreground"
												: "hover:bg-muted/60 text-foreground",
										)}
										onClick={() => setSelectedItemId(item.id)}
									>
										<div className="font-medium leading-snug line-clamp-2">
											{item.title}
										</div>
										<div className="text-xs text-muted-foreground mt-1 line-clamp-2">
											{item.description || "暂无描述"}
										</div>
									</button>
								))
							)}
						</div>
					</ScrollArea>

					<ScrollArea className="flex-1">
						<div className="p-4 space-y-4">
							{!selectedItem ? (
								<div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
									请从左侧选择框架
								</div>
							) : sortedVersions.length === 0 ? (
								<div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
									暂无版本
								</div>
							) : (
								<>
									{latestVersion ? (
										<section className="space-y-2">
											<h3 className="text-sm font-medium text-muted-foreground">
												最新
											</h3>
											<VersionRow
												apiType={apiType}
												courseName={activeYear}
												itemId={selectedItem.id}
												itemTitle={selectedItem.title}
												version={latestVersion}
												isLatest
												hasSuccess={hasBaseFolderSuccess(
													repoRecords,
													latestVersion.file?.id ?? "",
													latestVersion.file?.name ?? "",
												)}
												userPermissions={userPermissions}
											/>
										</section>
									) : null}
									{historyVersions.length > 0 ? (
										<section className="space-y-2">
											<h3 className="text-sm font-medium text-muted-foreground">
												历史
											</h3>
											<div className="space-y-3">
												{historyVersions.map((version, index) => (
													<VersionRow
														key={
															version.file?.id ??
															`${selectedItem.id}-history-${index}`
														}
														apiType={apiType}
														courseName={activeYear}
														itemId={selectedItem.id}
														itemTitle={selectedItem.title}
														version={version}
														isLatest={false}
														hasSuccess={hasBaseFolderSuccess(
															repoRecords,
															version.file?.id ?? "",
															version.file?.name ?? "",
														)}
														userPermissions={userPermissions}
													/>
												))}
											</div>
										</section>
									) : null}
								</>
							)}
						</div>
					</ScrollArea>
				</div>
			</DialogContent>
		</Dialog>
	)
}

interface VersionRowProps {
	apiType: RepoApiType
	courseName: string
	itemId: string
	itemTitle: string
	version: ResearchVersion
	isLatest: boolean
	hasSuccess: boolean
	userPermissions: string[]
}

interface VersionDescriptionProps {
	content: string
}

function VersionDescription({ content }: VersionDescriptionProps) {
	const [expanded, setExpanded] = useState(false)
	const [isOverflowing, setIsOverflowing] = useState(false)
	const contentRef = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		const el = contentRef.current
		if (!el || expanded) return

		setIsOverflowing(el.scrollHeight > el.clientHeight + 1)
	}, [expanded])

	return (
		<div>
			<div
				ref={contentRef}
				className={cn(
					VERSION_DESCRIPTION_MARKDOWN_CLASS,
					!expanded && VERSION_DESCRIPTION_COLLAPSED_HEIGHT,
					!expanded && "overflow-hidden",
				)}
			>
				<ReactMarkdown>{content}</ReactMarkdown>
			</div>
			{isOverflowing ? (
				<button
					type="button"
					className="mt-1 flex w-full items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
					onClick={() => setExpanded((prev) => !prev)}
				>
					{expanded ? "收起" : "展开详情"}
					<ChevronDown
						className={cn(
							"h-3.5 w-3.5 transition-transform duration-200",
							expanded && "rotate-180",
						)}
					/>
				</button>
			) : null}
		</div>
	)
}

function VersionRow({
	apiType,
	courseName,
	itemId,
	itemTitle,
	version,
	isLatest,
	hasSuccess,
	userPermissions,
}: VersionRowProps) {
	const file = version.file
	const isHidden = !!version.hidden
	const fid = file?.id ?? ""
	const extraPermissions = getExtraPermissions(file)
	const hasPermission = hasDownloadPermission(extraPermissions, userPermissions)

	const { stage, isBusy, start, manualRefresh } = useResearchDownload({
		apiType,
		fid,
		itemId,
		itemTitle,
		versionName: file?.name ?? "",
		courseName,
	})

	const [redownloadOpen, setRedownloadOpen] = useState(false)

	const handleDownload = () => {
		if (isHidden || !fid || !hasPermission) return
		if (stage === "manual") {
			manualRefresh()
			return
		}
		if (hasSuccess) {
			setRedownloadOpen(true)
			return
		}
		start()
	}

	const buttonLabel = (() => {
		if (isHidden) return "暂停下载"
		if (!hasPermission) return "暂无权限下载"
		if (stage === "initializing") return "初始化中..."
		if (stage === "downloading") return "下载中..."
		if (stage === "manual") return "手动刷新"
		return hasSuccess ? "重新下载" : "下载"
	})()

	const ButtonIcon = (() => {
		if (isBusy) return Loader2
		if (stage === "manual") return RefreshCw
		return Download
	})()

	return (
		<>
			<div className="rounded-lg border bg-card p-4 space-y-2">
				<div className="flex items-start justify-between gap-3">
					<div className="flex-1 min-w-0">
						<div className="text-xs text-muted-foreground">
							{version.time || file?.ut || file?.ct || ""}
						</div>
						<div className="flex items-center gap-2 flex-wrap mt-0.5">
							<span className="font-medium text-sm">
								{file?.name ?? "未命名"}
							</span>
							{isHidden ? (
								<Badge variant="destructive">历史版本，暂停下载</Badge>
							) : isLatest ? (
								<Badge variant="success">最新</Badge>
							) : (
								<Badge variant="secondary">历史版本</Badge>
							)}
						</div>
					</div>
					<Button
						size="sm"
						variant={isHidden || !hasPermission ? "outline" : "default"}
						disabled={isHidden || !fid || !hasPermission || isBusy}
						onClick={handleDownload}
					>
						<ButtonIcon
							className={cn("w-4 h-4 mr-1.5", isBusy && "animate-spin")}
						/>
						{buttonLabel}
					</Button>
				</div>
				{file?.description ? (
					<VersionDescription content={file.description} />
				) : null}
			</div>
			<ResearchRedownloadConfirmDialog
				open={redownloadOpen}
				onOpenChange={setRedownloadOpen}
				versionName={file?.name ?? ""}
				onConfirm={(overwrite) => {
					start({ overwrite })
				}}
			/>
		</>
	)
}
