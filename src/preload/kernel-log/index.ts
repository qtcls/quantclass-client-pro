/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import { subscribeWithCleanup } from "@/shared/lib/ipc-subscription.js"
import { ipcRenderer } from "electron"

type KernelLogCallback = (
	content: string,
	kernelType: "fuel" | "select" | "rocket",
	isInitial: boolean,
) => void

export const kernelLogIPC = {
	watchKernelLog: (kernelType?: "fuel" | "select" | "rocket") =>
		ipcRenderer.invoke(IPC_CHANNELS.WATCH_KERNEL_LOG, kernelType),
	unwatchKernelLog: (kernelType?: "fuel" | "select" | "rocket") =>
		ipcRenderer.invoke(IPC_CHANNELS.UNWATCH_KERNEL_LOG, kernelType),
	/** 订阅内核日志推送（payload-only），返回只移除本次订阅的退订函数 */
	onKernelLogChanged: (callback: KernelLogCallback): (() => void) =>
		subscribeWithCleanup(
			ipcRenderer,
			IPC_CHANNELS.KERNEL_LOG_CHANGED,
			(_event, content, kernelType, isInitial) =>
				callback(content, kernelType, isInitial),
		),

	// -- 独立窗口
	watchIndividualKernelLog: (kernelType?: "fuel" | "select" | "rocket") =>
		ipcRenderer.invoke(IPC_CHANNELS.WATCH_INDIVIDUAL_KERNEL_LOG, kernelType),
	unwatchIndividualKernelLog: (kernelType?: "fuel" | "select" | "rocket") =>
		ipcRenderer.invoke(IPC_CHANNELS.UNWATCH_INDIVIDUAL_KERNEL_LOG, kernelType),
	/** 订阅独立窗口内核日志推送（payload-only），返回只移除本次订阅的退订函数 */
	onIndividualKernelLogChanged: (callback: KernelLogCallback): (() => void) =>
		subscribeWithCleanup(
			ipcRenderer,
			IPC_CHANNELS.KERNEL_LOG_CHANGED_INDIVIDUAL,
			(_event, content, kernelType, isInitial) =>
				callback(content, kernelType, isInitial),
		),
}
