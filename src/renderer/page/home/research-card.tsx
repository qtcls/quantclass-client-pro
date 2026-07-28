/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { RESEARCH_SECTION_ROUTE } from "@/renderer/constant"
import { getResearchBasicCode, getResearchStrategies } from "@/renderer/request"
import type { ResearchItem, ResearchVersion } from "@/renderer/types/research"
import type { RepoApiType, RepoDownloadRecord } from "@/shared/types/repo"
import { useQueries, useQuery } from "@tanstack/react-query"
import { ArrowRight, BookOpen } from "lucide-react"
import { useMemo } from "react"
import { useNavigate } from "react-router"

function getVersionTimestamp(version: ResearchVersion): number {
	if (!version.time) return 0
	const ts = Date.parse(version.time.replace(" ", "T"))
	return Number.isNaN(ts) ? 0 : ts
}

function sortVersionsByTimeDesc(versions: ResearchVersion[]): ResearchVersion[] {
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
	records: RepoDownloadRecord[],
	fid: string,
	versionName: string,
): boolean {
	if (!fid || !versionName) return false
	return records.some(
		(r) => r.success && r.fid === fid && r.versionName === versionName,
	)
}

function filterLocalRecords(
	records: RepoDownloadRecord[],
	apiType: RepoApiType,
): RepoDownloadRecord[] {
	return records.filter(
		(record) => record.success && record.apiType === apiType && record.folderName,
	)
}

function getCourseYears(records: RepoDownloadRecord[]): string[] {
	return [
		...new Set(records.map((record) => record.courseName).filter(Boolean)),
	]
}

function countDistinctItems(records: RepoDownloadRecord[]): number {
	return new Set(records.map((record) => record.itemId)).size
}

function formatDownloadSubtitle(
	downloadedCount: number,
	pendingUpdates: number,
	isLoading: boolean,
	formatCount: (count: number) => string,
): string {
	if (isLoading) return "加载中..."
	if (downloadedCount === 0) return "暂无已下载"

	const countText = formatCount(downloadedCount)
	if (pendingUpdates > 0) {
		return `${countText} · ${pendingUpdates} 待更新`
	}
	return `${countText} · 全部最新`
}

function countPendingUpdates(
	localRecords: RepoDownloadRecord[],
	apiType: RepoApiType,
	remoteResults: Array<{ code?: number; data?: ResearchItem[] } | undefined>,
): number {
	const downloadedItemIds = new Set(
		filterLocalRecords(localRecords, apiType).map((record) => record.itemId),
	)
	if (downloadedItemIds.size === 0) return 0

	const pendingItemIds = new Set<string>()

	for (const result of remoteResults) {
		const items =
			result?.code === 200 && Array.isArray(result.data) ? result.data : []

		for (const item of items) {
			if (!downloadedItemIds.has(item.id)) continue

			const latestVersion = sortVersionsByTimeDesc(item.versions ?? [])[0]
			if (!latestVersion || latestVersion.hidden) continue

			const fid = latestVersion.file?.id ?? ""
			const versionName = latestVersion.file?.name ?? ""
			if (!hasBaseFolderSuccess(localRecords, fid, versionName)) {
				pendingItemIds.add(item.id)
			}
		}
	}

	return pendingItemIds.size
}

function useResearchCardStats() {
	const { data: repoRecords, isLoading: isRecordsLoading } = useQuery({
		queryKey: ["repo-records"],
		queryFn: () => window.electronAPI.listRepoRecords(),
		staleTime: 1000 * 30,
		refetchOnWindowFocus: false,
	})

	const records = repoRecords ?? []
	const strategyRecords = useMemo(
		() => filterLocalRecords(records, "strategies"),
		[records],
	)
	const frameworkRecords = useMemo(
		() => filterLocalRecords(records, "basic-code"),
		[records],
	)

	const strategyCourseYears = useMemo(
		() => getCourseYears(strategyRecords),
		[strategyRecords],
	)
	const frameworkCourseYears = useMemo(
		() => getCourseYears(frameworkRecords),
		[frameworkRecords],
	)

	const strategyRemoteQueries = useQueries({
		queries: strategyCourseYears.map((year) => ({
			queryKey: ["research-center", "strategies", year],
			queryFn: () => getResearchStrategies(year),
			staleTime: 1000 * 60 * 5,
			refetchOnWindowFocus: false,
		})),
	})

	const frameworkRemoteQueries = useQueries({
		queries: frameworkCourseYears.map((year) => ({
			queryKey: ["research-center", "basic-code", year],
			queryFn: () => getResearchBasicCode(year),
			staleTime: 1000 * 60 * 5,
			refetchOnWindowFocus: false,
		})),
	})

	const isRemoteLoading =
		strategyRemoteQueries.some((query) => query.isLoading) ||
		frameworkRemoteQueries.some((query) => query.isLoading)

	const isLoading = isRecordsLoading || isRemoteLoading

	const strategyDownloadedCount = countDistinctItems(strategyRecords)
	const frameworkCount = countDistinctItems(frameworkRecords)
	const strategyPendingUpdates = countPendingUpdates(
		records,
		"strategies",
		strategyRemoteQueries.map((query) => query.data),
	)
	const frameworkPendingUpdates = countPendingUpdates(
		records,
		"basic-code",
		frameworkRemoteQueries.map((query) => query.data),
	)

	return {
		isLoading,
		strategySubtitle: formatDownloadSubtitle(
			strategyDownloadedCount,
			strategyPendingUpdates,
			isLoading,
			(count) => `${count} 套已下载`,
		),
		frameworkSubtitle: formatDownloadSubtitle(
			frameworkCount,
			frameworkPendingUpdates,
			isLoading,
			(count) => `${count} 个框架`,
		),
	}
}

export function ResearchCard() {
	const navigate = useNavigate()
	const { strategySubtitle, frameworkSubtitle } = useResearchCardStats()

	return (
		<div className="bg-background border border-border rounded-xl overflow-hidden flex flex-col hover:border-foreground/30 transition-colors">
			<div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border">
				<span className="w-8 h-8 rounded-lg bg-muted grid place-items-center flex-shrink-0">
					<BookOpen size={18} strokeWidth={1.8} />
				</span>
				<span className="flex-1 min-w-0">
					<b className="text-base font-[650] block tracking-tight">投研</b>
					<span className="text-xs text-muted-foreground">
						策略库 · 框架源码
					</span>
				</span>
			</div>
			<div className="px-4 py-3.5 flex-1 flex flex-col">
				<div className="flex items-center gap-2.5 py-2">
					<span
						className="w-2.5 h-2.5 rounded-full flex-shrink-0"
						style={{ background: "#7c3aed" }}
					/>
					<span className="flex-1 min-w-0">
						<b className="text-sm font-semibold block">精心随机策略库</b>
						<span className="text-[10px] font-mono text-muted-foreground">
							{strategySubtitle}
						</span>
					</span>
				</div>
				<div className="h-px bg-border" />
				<div className="flex items-center gap-2.5 py-2">
					<span
						className="w-2.5 h-2.5 rounded-full flex-shrink-0"
						style={{ background: "#0ea5e9" }}
					/>
					<span className="flex-1 min-w-0">
						<b className="text-sm font-semibold block">框架源码</b>
						<span className="text-[10px] font-mono text-muted-foreground">
							{frameworkSubtitle}
						</span>
					</span>
				</div>
			</div>
			<button
				type="button"
				onClick={() => navigate(RESEARCH_SECTION_ROUTE)}
				className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors w-full text-left"
			>
				<span>进入投研中心</span>
				<ArrowRight size={15} strokeWidth={2} />
			</button>
		</div>
	)
}
