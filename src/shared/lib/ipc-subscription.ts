/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

/**
 * IPC 订阅作用域化退订（纯函数）。
 *
 * ⚠️ 本文件必须保持纯净：禁止 import electron / window / react 等任何宿主依赖。
 * 现役消费方是 preload 桥（emitter/index.ts，传入原生 ipcRenderer）。它是反向推送
 * 频道的唯一订阅入口，替代「全局 removeAllListeners 清场殃及其他订阅者」的退订
 * 方式 —— 每次订阅返回只移除自身的退订函数。
 */

import type { IpcChannel } from "@/shared/ipc-channels.js"

type Listener = (...args: any[]) => void

/**
 * 兼容三类 emitter：
 * - electron 原生 ipcRenderer：on 返回 IpcRenderer 自身 → 走 removeListener
 * - @electron-toolkit/preload 的桥代理：on 返回退订函数 → 直接使用
 *   （其 removeListener 已被官方标记 deprecated，且经 contextBridge 二次传参
 *   会产生新代理导致引用失配，必须优先用 on 的返回值）
 * - Node EventEmitter（scratch 验证脚手架）：on 返回 this → 走 removeListener
 */
interface SubscribableEmitter {
	on(channel: string, listener: Listener): unknown
	removeListener(channel: string, listener: Listener): unknown
}

/**
 * 订阅 channel 并返回幂等的作用域退订函数（只移除本次订阅，不影响同频道其他订阅者）。
 * 内部包一层 wrapper 保证每次订阅的 listener 引用唯一 —— 同一 handler 重复订阅时，
 * 各自的退订互不串扰。
 */
export const subscribeWithCleanup = (
	emitter: SubscribableEmitter,
	channel: IpcChannel,
	handler: Listener,
): (() => void) => {
	const listener: Listener = (...args) => handler(...args)
	const maybeCleanup = emitter.on(channel, listener)
	let disposed = false

	return () => {
		if (disposed) return
		disposed = true

		if (typeof maybeCleanup === "function") {
			maybeCleanup()
			return
		}

		emitter.removeListener(channel, listener)
	}
}
