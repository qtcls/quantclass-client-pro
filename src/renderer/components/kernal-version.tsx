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
import { useAlertDialog } from "@/renderer/context/alert-dialog"
import { useHandleTimeTask } from "@/renderer/hooks/useHandleTimeTask"
import { useInvokeUpdateKernal } from "@/renderer/hooks/useInvokeUpdateKernal"
import { useToggleAutoRealTrading } from "@/renderer/hooks/useToggleAutoRealTrading"
import { cn } from "@/renderer/lib/utils"
import {
	getKernelVersionUpdateLevel,
} from "@/renderer/utils/kernel-version-status"
import { versionsAtom } from "@/renderer/store/versions"
import type { KernalVersionType } from "@/shared/types"
import type { AppVersions } from "@/shared/types"
import type { KernalType } from "@/shared/types"
import { useAtomValue } from "jotai"
import { Check, Circle, CircleAlert } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { CircleArrowUp } from "lucide-react"
import { useMemo } from "react"
import { toast } from "sonner"

const KernalVersionSelectItem = ({
	version,
	current,
	label,
	onClick,
}: {
	current: string
	version: KernalVersionType
	label: {
		title: string
		badge: string
	}
	onClick: () => void
}) => {
	const isLatest = useMemo(() => {
		return current === version.version
	}, [current, version.version])

	const isPulled = useMemo(() => {
		return version.label === "pulled"
	}, [version.label])

	return (
		<div
			key={version.version}
			className={cn(
				"border-1.5 rounded-xl px-3.5 py-2 cursor-pointer space-y-1",
				isLatest ? "border-primary" : "border-muted hover:bg-primary/10",
				isPulled &&
					"text-muted-foreground hover:bg-transparent cursor-not-allowed",
			)}
			onClick={isPulled || isLatest ? undefined : onClick}
		>
			<div className="font-medium flex items-center gap-1">
				{isLatest ? (
					<Check className="size-4 bg-primary text-primary-foreground rounded-full border-2 border-primary" />
				) : (
					<Circle className="size-4" />
				)}
				<span className={cn("text-mono", isLatest && "font-bold")}>
					{version.version}
				</span>

				{label && (
					<Badge
						variant={label.badge as any}
						className={cn(isPulled && "text-danger")}
					>
						{label.title}
					</Badge>
				)}
			</div>
			<div className="text-sm text-muted-foreground">
				<p>{version.description}</p>
				<p>发布日期：{version.release}</p>
			</div>
		</div>
	)
}

const KernalVersionSelect = ({
	name,
	title,
	versionKey,
	versions = [],
	onVersionSelect,
	isObsolete = false,
}: {
	name: string
	title: string
	versionKey: string
	versions: KernalVersionType[]
	onVersionSelect?: (version: KernalVersionType, name: string) => void
	isObsolete?: boolean
}) => {
	const version = useAtomValue(versionsAtom)[versionKey]
	const useAlert = useAlertDialog()
	const versionLabels = {
		stable: {
			title: "稳定版",
			badge: "outline",
		},
		beta: {
			title: "测试版",
			badge: "outline-info",
		},
		pulled: {
			title: "已下线",
			badge: "secondary",
		},
	}
	return (
		<span
			className={cn(
				"text-xs cursor-pointer",
				isObsolete ? "text-danger animate-bounce" : "text-muted-foreground",
			)}
			onClick={() => {
				useAlert.open({
					title: `切换${title}(${name})内核？`,
					content: (
						<div className="space-y-3 leading-relaxed">
							{isObsolete && (
								<div className="bg-danger border border-danger-200 rounded-lg px-3 py-2 animate-pulse text-danger-foreground">
									<div className="flex items-center gap-2">
										<CircleAlert className="size-6 min-w-6" />
										<div>
											{title}内核{" "}
											<span className="font-mono bg-danger-100 text-danger px-1 py-0.5 rounded">
												{version}
											</span>{" "}
											不能和当前客户端版本一起使用，请选择其他内核版本
										</div>
									</div>
								</div>
							)}
							{versions.map((remoteVersion) => (
								<KernalVersionSelectItem
									key={remoteVersion.version}
									current={version}
									version={remoteVersion}
									label={versionLabels[remoteVersion.label ?? "none"]}
									onClick={() => {
										onVersionSelect?.(remoteVersion, name)
									}}
								/>
							))}
						</div>
					),
					isContentLong: true,
				})
			}}
		>
			{isObsolete ? "需要更新" : "切换"}
		</span>
	)
}

export const KernalVersion = ({
	name,
	title,
	Icon,
	versionKey,
	appVersions,
	disabled = false,
}: {
	name: string
	title: string
	Icon: LucideIcon
	versionKey: string
	appVersions: AppVersions | undefined
	disabled?: boolean
}) => {
	const version = useAtomValue(versionsAtom)
	const useAlert = useAlertDialog()
	const invokeUpdateKernal = useInvokeUpdateKernal()
	const handleTimeTask = useHandleTimeTask()
	const { isAutoRocket, handleToggleAutoRocket } = useToggleAutoRealTrading()
	const { killKernal } = window.electronAPI

	const latestVersion = useMemo(() => {
		return appVersions?.latest?.[name]
	}, [appVersions?.latest])

	const currentVersion = useMemo(() => {
		return version[versionKey]
	}, [version])

	const versionList = useMemo(() => {
		return appVersions?.[name] ?? []
	}, [appVersions?.[name]])

	const updateLevel = useMemo(
		() =>
			getKernelVersionUpdateLevel(
				currentVersion,
				latestVersion,
				versionList,
			),
		[currentVersion, latestVersion, versionList],
	)

	const hasUpdate = updateLevel === "optional"
	const isObsolete = updateLevel === "required"

	const latestVersionDetail = useMemo(() => {
		if (!latestVersion) return undefined
		return versionList.find((v) => v.version === latestVersion)
	}, [versionList, latestVersion])

	const handleKernalUpdate = (
		targetVersion?: string,
		kernelName?: string,
		versionDetail?: Pick<KernalVersionType, "description" | "release">,
	) => {
		if (disabled) {
			toast.error(`当前操作系统不支持更新${title}内核`)
			return
		}
		const displayTargetVersion = targetVersion || "最新版本"
		const displayKernelName = kernelName || name

		useAlert.open({
			title: `更新${title}(${displayKernelName})内核？`,
			content: (
				<div className="space-y-3 leading-relaxed">
					<div className="bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 rounded-lg px-3 py-2.5">
						<div className="flex items-center gap-2 text-blue-500">
							<CircleArrowUp className="size-4" />
							<span className="font-medium">版本更新提醒</span>
						</div>
						<p className="text-sm text-blue-500 mt-1">
							即将
							{currentVersion !== "暂无内核" && (
								<>
									从版本{" "}
									<span className="font-mono bg-blue-200 text-blue-600 px-1 py-0.5 rounded">
										{currentVersion}
									</span>{" "}
								</>
							)}
							更新到版本{" "}
							<span className="font-mono bg-blue-200 text-blue-600 px-1 py-0.5 rounded">
								{displayTargetVersion}
							</span>
						</p>
						{versionDetail?.description ? (
							<p className="text-sm text-blue-500/90 mt-2 leading-snug">
								{versionDetail.description}
							</p>
						) : null}
						{versionDetail?.release ? (
							<p className="text-sm text-blue-500/80 mt-1.5">
								发布日期：{versionDetail.release}
							</p>
						) : null}
					</div>
					<p>
						🛑 下载内核前，会自动停止自动数据更新和实盘功能。完成后，需要
						<span className="text-warning">手动开启</span>。
					</p>
					<p>
						🔥 下载内核的时候，会强制退出运行中的{displayKernelName}
						进程，建议手动停止数据更新以及实盘功能后更新。
					</p>
					<p>⏩ 内核下载立即生效，建议盘后下载较为稳妥。</p>
					<p>💬 如果遇到问题，可以私信林奇或者夏普助教帮助。</p>
				</div>
			),
			okText: "立即更新",
			okDelay: 5,
			isContentLong: true,
			onOk: async () => {
				// 暂停数据更新和实盘功能
				await handleTimeTask(true, false)
				if (isAutoRocket) {
					await handleToggleAutoRocket(false, false)
				}

				await killKernal(kernelName as KernalType, true)

				await invokeUpdateKernal(kernelName as KernalType, targetVersion)
			},
		})
	}
	return (
		<div className="space-y-1">
			<h3 className="font-medium text-sm flex items-center gap-1">
				<Icon className="size-4" />
				{title}
				{hasUpdate && !isObsolete && (
					<span
						className="text-xs text-blue-500 dark:text-blue-400 cursor-pointer"
						onClick={() =>
							handleKernalUpdate(latestVersion, name, latestVersionDetail)
						}
						title={`更新${title}(${name})内核到版本 ${latestVersion}`}
					>
						{currentVersion === "暂无内核" ? "下载" : "更新"}
					</span>
				)}
				{versionList.length > 0 && (
					<KernalVersionSelect
						name={name}
						title={title}
						versionKey={versionKey}
						versions={versionList}
						onVersionSelect={(v, n) =>
							handleKernalUpdate(v.version, n, v)
						}
						isObsolete={isObsolete}
					/>
				)}
			</h3>
			{disabled ? (
				<Badge variant="secondary" className="font-mono">
					{window.electron?.process?.platform === "darwin"
						? "macOS 不支持"
						: "当前操作系统不支持"}
				</Badge>
			) : (
				<Badge className="font-mono">{currentVersion}</Badge>
			)}
		</div>
	)
}
