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
 * kernel-log 监听器的窗口关闭清扫（纯逻辑，无 electron 依赖）。
 *
 * 背景：watchOneKernel 每次调用都对 senderWindow 注册一个 once("closed")，
 * 反复 watch 会在窗口上堆积 closed 监听器。本模块把"每窗口仅注册一次、
 * 关闭时只清扫本窗口拥有的 watcher"收敛为可独立断言的逻辑
 * （scratch/verify-listener-sweep.ts 直接驱动假窗口验证）。
 */

export interface KernelWatcherRecord {
	timer: ReturnType<typeof setInterval>
	lastSize: number
	/** 创建该 watcher 的窗口 webContents.id；无窗口时为 -1，永不被清扫 */
	ownerId: number
}

/** BrowserWindow 的最小结构面：once("closed") + webContents.id */
export interface ClosableWindowLike {
	once(event: "closed", listener: () => void): unknown
	webContents: { id: number }
}

const sweepRegisteredWindows = new WeakSet<ClosableWindowLike>()

/**
 * 给窗口注册（至多一次）closed 清扫：窗口关闭时，遍历所有 watcher 家族，
 * 仅清掉 ownerId 等于本窗口 webContents.id 的条目（不殃及其他窗口的 watcher）。
 * id 在注册时快照，避免 closed 后访问已销毁的 webContents。
 */
export function registerWindowClosedSweep(
	win: ClosableWindowLike,
	families: ReadonlyArray<Map<string, KernelWatcherRecord>>,
	clearTimerFn: (timer: KernelWatcherRecord["timer"]) => void = clearInterval,
): void {
	if (sweepRegisteredWindows.has(win)) return
	sweepRegisteredWindows.add(win)

	const ownerId = win.webContents.id
	win.once("closed", () => {
		for (const watchers of families) {
			for (const [key, record] of watchers) {
				if (record.ownerId === ownerId) {
					clearTimerFn(record.timer)
					watchers.delete(key)
				}
			}
		}
	})
}
