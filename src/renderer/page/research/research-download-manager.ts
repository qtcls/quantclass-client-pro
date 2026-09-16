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

interface DownloadTask {
	args: UseResearchDownloadArgs
	stage: ResearchDownloadStage
	ticket: string
	startedAt: number
	pollTimer: ReturnType<typeof setTimeout> | null
	toastId: string | number | undefined
	overwrite: boolean
	listeners: Set<() => void>
}

type InvalidateRecords = () => void

function getTaskKey(args: Pick<UseResearchDownloadArgs, "fid" | "versionName">) {
	return `${args.fid}:${args.versionName}`
}

class ResearchDownloadManager {
	private tasks = new Map<string, DownloadTask>()
	private invalidateRecords: InvalidateRecords = () => {}

	setInvalidateRecords(fn: InvalidateRecords) {
		this.invalidateRecords = fn
	}

	getStage(key: string): ResearchDownloadStage {
		return this.tasks.get(key)?.stage ?? "idle"
	}

	subscribe(key: string, listener: () => void) {
		let task = this.tasks.get(key)
		if (!task) {
			task = {
				args: {} as UseResearchDownloadArgs,
				stage: "idle",
				ticket: "",
				startedAt: 0,
				pollTimer: null,
				toastId: undefined,
				overwrite: false,
				listeners: new Set(),
			}
			this.tasks.set(key, task)
		}
		task.listeners.add(listener)
		return () => {
			task?.listeners.delete(listener)
		}
	}

	private notify(key: string) {
		const task = this.tasks.get(key)
		if (!task) return
		for (const listener of task.listeners) {
			listener()
		}
	}

	private updateStage(key: string, stage: ResearchDownloadStage) {
		const task = this.tasks.get(key)
		if (!task) return
		task.stage = stage
		this.notify(key)
	}

	private clearPollTimer(task: DownloadTask) {
		if (task.pollTimer != null) {
			clearTimeout(task.pollTimer)
			task.pollTimer = null
		}
	}

	private async runDownload(key: string, link: string) {
		const task = this.tasks.get(key)
		if (!task) return

		const { ticket, args, overwrite } = task

		this.updateStage(key, "downloading")
		toast.loading(`${args.itemTitle} 下载中...`, { id: task.toastId })

		await window.electronAPI.updateRepoRecord(ticket, { link })

		const result = await window.electronAPI.downloadAndExtractRepo({
			link,
			apiType: args.apiType,
			versionName: args.versionName,
			overwrite,
		})

		if (result.success) {
			await window.electronAPI.updateRepoRecord(ticket, {
				success: true,
				extractDir: result.extractDir ?? "",
				folderName: result.folderName ?? "",
			})
			this.updateStage(key, "done")
			toast.success(`${args.itemTitle} 下载成功`, { id: task.toastId })
		} else {
			await window.electronAPI.updateRepoRecord(ticket, {
				failed: true,
				errorMessage: result.error || "未知错误",
			})
			this.updateStage(key, "failed")
			toast.error(`${args.itemTitle} 下载失败`, {
				id: task.toastId,
				description: result.error,
			})
		}
		this.invalidateRecords()
	}

	private async pollOnce(key: string): Promise<boolean> {
		const task = this.tasks.get(key)
		if (!task?.ticket) return false
		try {
			const resp = await getResearchDownloadLink(task.ticket)
			if (resp?.link) {
				this.clearPollTimer(task)
				await this.runDownload(key, resp.link)
				return true
			}
		} catch {}
		return false
	}

	private schedulePoll(key: string) {
		const task = this.tasks.get(key)
		if (!task) return

		task.pollTimer = setTimeout(async () => {
			task.pollTimer = null
			if (task.stage !== "initializing") return

			const downloaded = await this.pollOnce(key)
			if (downloaded) return

			if (task.stage !== "initializing") return

			if (Date.now() - task.startedAt >= POLL_TIMEOUT_MS) {
				this.updateStage(key, "manual")
				toast.message("等待下载链接超时，可点击手动刷新", {
					id: task.toastId,
				})
				return
			}

			this.schedulePoll(key)
		}, POLL_INTERVAL_MS)
	}

	async start(
		args: UseResearchDownloadArgs,
		options?: { overwrite?: boolean },
	) {
		const key = getTaskKey(args)
		let task = this.tasks.get(key)

		if (
			task &&
			(task.stage === "initializing" || task.stage === "downloading")
		) {
			return
		}

		if (!task) {
			task = {
				args,
				stage: "idle",
				ticket: "",
				startedAt: 0,
				pollTimer: null,
				toastId: undefined,
				overwrite: false,
				listeners: new Set(),
			}
			this.tasks.set(key, task)
		}

		task.args = args
		task.overwrite = options?.overwrite ?? false
		this.clearPollTimer(task)
		task.ticket = ""
		task.startedAt = Date.now()

		const toastId = toast.loading(`${args.itemTitle} 初始化中...`)
		task.toastId = toastId
		this.updateStage(key, "initializing")

		try {
			const resp = await postResearchTicket(args.fid)
			if (!resp?.success || !resp.ticket) {
				throw new Error(resp?.message || "获取下载凭证失败")
			}
			task.ticket = resp.ticket

			const now = Date.now()
			await window.electronAPI.appendRepoRecord({
				ticket: resp.ticket,
				fid: args.fid,
				itemId: args.itemId,
				itemTitle: args.itemTitle,
				versionName: args.versionName,
				apiType: args.apiType,
				courseName: args.courseName,
				link: "",
				extractDir: "",
				folderName: "",
				success: false,
				createdAt: now,
				updatedAt: now,
			})
			this.invalidateRecords()

			this.schedulePoll(key)
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			this.updateStage(key, "failed")
			toast.error("初始化下载失败", {
				id: task.toastId,
				description: message,
			})
		}
	}

	async manualRefresh(args: UseResearchDownloadArgs) {
		const key = getTaskKey(args)
		const task = this.tasks.get(key)
		if (!task || task.stage !== "manual" || !task.ticket) return

		task.args = args
		this.updateStage(key, "initializing")
		toast.loading("重新检查下载链接...", { id: task.toastId })

		const downloaded = await this.pollOnce(key)
		if (!downloaded) {
			this.updateStage(key, "manual")
			toast.message("下载链接仍未就绪，请稍后再试", {
				id: task.toastId,
			})
		}
	}
}

export const researchDownloadManager = new ResearchDownloadManager()

export { getTaskKey }
