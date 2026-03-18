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
		const handler = (
			_: unknown,
			content: string,
			kernelType: "fuel" | "select" | "rocket",
			isInitial: boolean,
		) => callback(content, kernelType, isInitial)
		ipcRenderer.on("kernel-log-changed", handler)
		return () => {
			ipcRenderer.removeListener("kernel-log-changed", handler)
		}
	},
	offKernelLogChanged: () => {
		ipcRenderer.removeAllListeners("kernel-log-changed")
	},

	// -- 独立窗口
	watchIndividualKernelLog: (kernelType?: "fuel" | "select" | "rocket") =>
		ipcRenderer.invoke("watch-individual-kernel-log", kernelType),
	unwatchIndividualKernelLog: (kernelType?: "fuel" | "select" | "rocket") =>
		ipcRenderer.invoke("unwatch-individual-kernel-log", kernelType),
	onIndividualKernelLogChanged: (
		callback: (
			content: string,
			kernelType: "fuel" | "select" | "rocket",
			isInitial: boolean,
		) => void,
	) => {
		const handler = (
			_: unknown,
			content: string,
			kernelType: "fuel" | "select" | "rocket",
			isInitial: boolean,
		) => callback(content, kernelType, isInitial)
		ipcRenderer.on("kernel-log-changed-individual", handler)
		return () => {
			ipcRenderer.removeListener("kernel-log-changed-individual", handler)
		}
	},
	offIndividualKernelLogChanged: () => {
		ipcRenderer.removeAllListeners("kernel-log-changed-individual")
	},
}
