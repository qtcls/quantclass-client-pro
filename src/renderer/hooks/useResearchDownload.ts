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
	type ResearchDownloadStage,
	type UseResearchDownloadArgs,
	getTaskKey,
	researchDownloadManager,
} from "@/renderer/page/research/research-download-manager"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useSyncExternalStore } from "react"

export type { ResearchDownloadStage, UseResearchDownloadArgs }

export const useResearchDownload = (args: UseResearchDownloadArgs) => {
	const queryClient = useQueryClient()
	const taskKey = getTaskKey(args)

	useEffect(() => {
		researchDownloadManager.setInvalidateRecords(() => {
			queryClient.invalidateQueries({ queryKey: ["repo-records"] })
		})
	}, [queryClient])

	const stage = useSyncExternalStore(
		(listener) => researchDownloadManager.subscribe(taskKey, listener),
		() => researchDownloadManager.getStage(taskKey),
		() => "idle" as ResearchDownloadStage,
	)

	const start = useCallback(
		(options?: { overwrite?: boolean }) => {
			researchDownloadManager.start(args, options)
		},
		[args],
	)

	const manualRefresh = useCallback(() => {
		researchDownloadManager.manualRefresh(args)
	}, [args])

	const isBusy = stage === "initializing" || stage === "downloading"

	return {
		stage,
		isBusy,
		start,
		manualRefresh,
	}
}
