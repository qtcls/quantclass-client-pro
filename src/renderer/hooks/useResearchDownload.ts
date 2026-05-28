/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { getResearchDownloadLink, postResearchTicket } from "@/renderer/request"
import type { RepoApiType } from "@/shared/types/repo.js"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

export type ResearchDownloadStage =
	| "idle"
	| "initializing"
	| "manual"
	| "downloading"
	| "done"
	| "failed"

export interface UseResearchDownloadArgs {
	apiType: RepoApiType
	fid: string
	itemId: string
	itemTitle: string
	versionName: string
	courseName: string
}

const POLL_INTERVAL_MS = 1000
const POLL_TIMEOUT_MS = 3 * 60 * 1000

export const useResearchDownload = (args: UseResearchDownloadArgs) => {
	const [stage, setStage] = useState<ResearchDownloadStage>("idle")
	const queryClient = useQueryClient()

	const argsRef = useRef(args)
	argsRef.current = args

	const stageRef = useRef<ResearchDownloadStage>("idle")
	const ticketRef = useRef("")
	const startedAtRef = useRef(0)
	const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const toastIdRef = useRef<string | number | undefined>(undefined)
	const overwriteRef = useRef(false)

	const updateStage = useCallback((next: ResearchDownloadStage) => {
		stageRef.current = next
		setStage(next)
	}, [])

	const clearPollTimer = useCallback(() => {
		if (pollTimerRef.current != null) {
			clearTimeout(pollTimerRef.current)
			pollTimerRef.current = null
		}
	}, [])

	const invalidateRecords = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ["repo-records"] })
	}, [queryClient])

	useEffect(() => () => clearPollTimer(), [clearPollTimer])

	const runDownload = useCallback(
		async (link: string) => {
			const ticket = ticketRef.current
			const a = argsRef.current

			updateStage("downloading")
			toast.loading(`${a.itemTitle} 下载中...`, { id: toastIdRef.current })

			await window.electronAPI.updateRepoRecord(ticket, { link })

			const result = await window.electronAPI.downloadAndExtractRepo({
				link,
				apiType: a.apiType,
				versionName: a.versionName,
				overwrite: overwriteRef.current,
			})

			if (result.success) {
				await window.electronAPI.updateRepoRecord(ticket, {
					success: true,
					extractDir: result.extractDir ?? "",
					folderName: result.folderName ?? "",
				})
				updateStage("done")
				toast.success(`${a.itemTitle} 下载成功`, { id: toastIdRef.current })
			} else {
				await window.electronAPI.updateRepoRecord(ticket, {
					failed: true,
					errorMessage: result.error || "未知错误",
				})
				updateStage("failed")
				toast.error(`${a.itemTitle} 下载失败`, {
					id: toastIdRef.current,
					description: result.error,
				})
			}
			invalidateRecords()
		},
		[invalidateRecords, updateStage],
	)

	// -- 单次请求下载链接（轮询超时后调用）
	const pollOnce = useCallback(async (): Promise<boolean> => {
		const ticket = ticketRef.current
		if (!ticket) return false
		try {
			const resp = await getResearchDownloadLink(ticket)
			if (resp?.link) {
				clearPollTimer()
				await runDownload(resp.link)
				return true
			}
		} catch {}
		return false
	}, [clearPollTimer, runDownload])

	const schedulePoll = useCallback(() => {
		pollTimerRef.current = setTimeout(async () => {
			pollTimerRef.current = null
			if (stageRef.current !== "initializing") return

			const downloaded = await pollOnce()
			if (downloaded) return

			if (stageRef.current !== "initializing") return

			if (Date.now() - startedAtRef.current >= POLL_TIMEOUT_MS) {
				updateStage("manual")
				toast.message("等待下载链接超时，可点击手动刷新", {
					id: toastIdRef.current,
				})
				return
			}

			schedulePoll()
		}, POLL_INTERVAL_MS)
	}, [pollOnce, updateStage])

	const start = useCallback(async (options?: { overwrite?: boolean }) => {
		if (
			stageRef.current === "initializing" ||
			stageRef.current === "downloading"
		) {
			return
		}

		overwriteRef.current = options?.overwrite ?? false

		clearPollTimer()
		ticketRef.current = ""
		startedAtRef.current = Date.now()

		const a = argsRef.current
		const toastId = toast.loading(`${a.itemTitle} 初始化中...`)
		toastIdRef.current = toastId
		updateStage("initializing")

		try {
			const resp = await postResearchTicket(a.fid)
			if (!resp?.success || !resp.ticket) {
				throw new Error(resp?.message || "获取下载凭证失败")
			}
			ticketRef.current = resp.ticket

			const now = Date.now()
			await window.electronAPI.appendRepoRecord({
				ticket: resp.ticket,
				fid: a.fid,
				itemId: a.itemId,
				itemTitle: a.itemTitle,
				versionName: a.versionName,
				apiType: a.apiType,
				courseName: a.courseName,
				link: "",
				extractDir: "",
				folderName: "",
				success: false,
				createdAt: now,
				updatedAt: now,
			})
			invalidateRecords()

			schedulePoll()
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			updateStage("failed")
			toast.error("初始化下载失败", {
				id: toastIdRef.current,
				description: message,
			})
		}
	}, [clearPollTimer, invalidateRecords, schedulePoll, updateStage])

	const manualRefresh = useCallback(async () => {
		if (stageRef.current !== "manual") return
		if (!ticketRef.current) return

		updateStage("initializing")
		toast.loading("重新检查下载链接...", { id: toastIdRef.current })

		const downloaded = await pollOnce()
		if (!downloaded) {
			updateStage("manual")
			toast.message("下载链接仍未就绪，请稍后再试", {
				id: toastIdRef.current,
			})
		}
	}, [pollOnce, updateStage])

	const isBusy = stage === "initializing" || stage === "downloading"

	return {
		stage,
		isBusy,
		start,
		manualRefresh,
	}
}
