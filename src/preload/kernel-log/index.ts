/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { ipcRenderer } from "electron"

export const kernelLogIPC = {
	watchKernelLog: (kernelType?: "fuel" | "select" | "rocket") =>
		ipcRenderer.invoke("watch-kernel-log", kernelType),
	unwatchKernelLog: (kernelType?: "fuel" | "select" | "rocket") =>
		ipcRenderer.invoke("unwatch-kernel-log", kernelType),
	onKernelLogChanged: (
		callback: (
			content: string,
			kernelType: "fuel" | "select" | "rocket",
			isInitial: boolean,
		) => void,
	) => {
		ipcRenderer.on("kernel-log-changed", (_, content, kernelType, isInitial) =>
			callback(content, kernelType, isInitial),
		)
	},
	offKernelLogChanged: () => {
		ipcRenderer.removeAllListeners("kernel-log-changed")
	},
}
