/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { UpdateInfo } from "electron-updater"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { RENDERER_MSG_CODE } from "@/renderer/constant"
import { UpdateStatus } from "@/renderer/context/update-context"
import { useAppUpdate } from "@/renderer/hooks/useAppUpdate"
import { errAlertAtom, loadingAnimeAtom } from "@/renderer/store"
import { useSetAtom } from "jotai"

const { reportError } = window.electronAPI

export const useReportErr = () => {
	const { setStatus, setUpdateInfo } = useAppUpdate()
	const setErrAlert = useSetAtom(errAlertAtom)
	const setLoading = useSetAtom(loadingAnimeAtom)
	const [alertContent, setAlertContent] = useState<string>()
	const [content, setContent] = useState<string>()

	useEffect(() => {
		const unsubscribe = reportError((res) => {
			toast.dismiss()
			switch (res.code) {
				case 400:
					toast.warning(res.message as string)
					setErrAlert(true)
					setAlertContent(res.message as string)
					break
				case RENDERER_MSG_CODE.UPDATE_NOTICE:
					setUpdateInfo(res.message as UpdateInfo)
					break
				case RENDERER_MSG_CODE.UPDATE_NOT_AVAILABLE:
					toast.dismiss()
					toast.info("当前已是最新版本")
					break
				case RENDERER_MSG_CODE.UPDATE_INSTALL_FAILED:
					toast.error(res.message as string, { duration: 8 * 1000 })
					break
				case RENDERER_MSG_CODE.UPDATE_DOWNLOAD_FINISH:
					setStatus(UpdateStatus.Confirm)
					setUpdateInfo(res.info as UpdateInfo)
					toast.info(res.message as string, { duration: 6 * 1000 })
					break
				case RENDERER_MSG_CODE.BACKTEST_CODE:
					toast.dismiss()
					toast[res.msgType!](res.message as string, { duration: 6 * 1000 })
					break
				case RENDERER_MSG_CODE.CALC_TRADING_PLAN:
					setLoading(res.message === "start")
					setContent(res.message === "start" ? "开始计算交易计划" : undefined)
					break
				case RENDERER_MSG_CODE.NOTIFICATION: {
					const extra = res as unknown as {
						msgType?: "info" | "success" | "warning" | "error"
						title?: string
					}
					const msgType = extra.msgType ?? "info"
					const text = extra.title
						? `${extra.title}：${res.message as string}`
						: (res.message as string)
					toast[msgType](text, { duration: 6 * 1000 })
					break
				}
				default:
					break
			}
		})

		return unsubscribe
	}, [])

	return {
		alertContent,
		content,
	}
}
