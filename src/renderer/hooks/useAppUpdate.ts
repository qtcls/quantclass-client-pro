/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { UpdateStatus, useUpdate } from "@/renderer/context/update-context"
import { useEffect } from "react"

export const useAppUpdate = () => {
	const {
		status,
		setStatus,
		progress,
		setProgress,
		updateInfo,
		setUpdateInfo,
	} = useUpdate()

	const confirmCallback = (option: boolean) => {
		if (option) {
			window.electronAPI.appUpdaterConfirm(option)
			setStatus(UpdateStatus.Waiting)
		}
	}

	useEffect(() => {
		const unsubscribe = window.electronAPI.onUpdateProgress((progress) => {
			if (status === UpdateStatus.Waiting) {
				setStatus(UpdateStatus.Downloading)
			}
			if (progress.percent === 100) {
				setStatus(UpdateStatus.Confirm)
			}
			setProgress(progress)
		})

		return unsubscribe
	}, [status])

	return {
		status,
		setStatus,
		progress,
		confirmCallback,
		updateInfo,
		setUpdateInfo,
	}
}
