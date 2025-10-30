/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { ProgressInfo, UpdateInfo } from "electron-updater"
import type { ReactNode } from "react"
import { createContext, useContext, useState } from "react"

export enum UpdateStatus {
	Confirm = "Confirm",
	Waiting = "Waiting",
	Downloading = "Downloading",
	Done = "Done",
}

interface UpdateContextType {
	status: UpdateStatus
	setStatus: (status: UpdateStatus) => void
	progress?: ProgressInfo
	setProgress: (progress: ProgressInfo) => void
	updateInfo?: UpdateInfo
	setUpdateInfo: (updateInfo: UpdateInfo) => void
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined)

export function UpdateProvider({ children }: { children: ReactNode }) {
	const [status, setStatus] = useState<UpdateStatus>(UpdateStatus.Waiting)
	const [progress, setProgress] = useState<ProgressInfo>()
	const [updateInfo, setUpdateInfo] = useState<UpdateInfo>()

	return (
		<UpdateContext.Provider
			value={{
				status,
				setStatus,
				progress,
				setProgress,
				updateInfo,
				setUpdateInfo,
			}}
		>
			{children}
		</UpdateContext.Provider>
	)
}

export function useUpdate() {
	const context = useContext(UpdateContext)
	if (!context) {
		throw new Error("useUpdate must be used within UpdateProvider")
	}
	return context
}
