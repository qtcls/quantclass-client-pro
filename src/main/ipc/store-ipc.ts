/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { mergeRealMarketConfig } from "@/main/store/real-market-config.js"
import { isKernalBusy } from "@/main/utils/tools.js"
import logger from "@/main/utils/wiston.js"
import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import {
	type RealMarketConfigUi,
	encodeToWire,
} from "@/shared/lib/real-market-config-codec.js"
import type { SaveRealMarketConfigAck } from "@/shared/types/trading.js"
import { type IpcMainInvokeEvent, ipcMain } from "electron"
import Store from "electron-store"

const store = new Store()

/**
 * S2a：`real_market_config` 已收敛为唯一权威写入通道 `save-real-market-config`
 * （编码冻结 + merge 不 clobber + 权威拒绝运行中写）。此处对通用 set-store/delete-store
 * 在 key 级拒绝该配置（含 `real_market_config.` 子路径），堵死整对象 clobber 的绕行通道
 * （未迁移/未来误用都无法绕过 codec 与 merge）。
 */
const isRealMarketConfigKey = (key: unknown): boolean => {
	const k = String(key)
	return k === "real_market_config" || k.startsWith("real_market_config.")
}

const setStoreIPC = () =>
	ipcMain.handle(IPC_CHANNELS.SET_STORE, (__: IpcMainInvokeEvent, key, value) => {
		if (isRealMarketConfigKey(key)) {
			logger.warn(
				`[real_market_config] 拒绝经 set-store 写入 "${String(key)}"，请改用 save-real-market-config`,
			)
			return
		}
		store.set(key, value)
	})

const getStoreIPC = () =>
	ipcMain.handle(
		IPC_CHANNELS.GET_STORE,
		async (_: IpcMainInvokeEvent, key, defaultValue = {}) => {
			const value = await store.get(key)

			if (typeof value === "boolean") {
				return value
			}

			return (await store.get(key)) || defaultValue
		},
	)

const deleteStoreIPC = () =>
	ipcMain.handle(IPC_CHANNELS.DELETE_STORE, (_: IpcMainInvokeEvent, key) => {
		if (isRealMarketConfigKey(key)) {
			logger.warn(
				`[real_market_config] 拒绝经 delete-store 删除 "${String(key)}"，请改用 save-real-market-config`,
			)
			return
		}
		store.delete(key)
	})

/**
 * 实盘配置 `real_market_config` 唯一权威写入通道（S2a 单源化）。
 * - 先 main 权威拒绝 rocket 忙时写入（fail-closed：禁止运行/更新中改钱路径配置；
 *   用 isKernalBusy=running∪updating，与 S1 disable 路径同口径，不依赖 renderer 5s 轮询的 rocketStatus）。
 * - encodeToWire（UI→wire，只含显式 key、编码冻结）→ mergeRealMarketConfig（不 clobber 兄弟、不物化默认）。
 * - try/catch 永不 reject：异常返回 {ok:false}，避免 renderer 挂起；fail-closed 不写脏配置。
 */
const saveRealMarketConfigIPC = () =>
	ipcMain.handle(
		IPC_CHANNELS.SAVE_REAL_MARKET_CONFIG,
		async (
			_: IpcMainInvokeEvent,
			uiPartial: Partial<RealMarketConfigUi>,
		): Promise<SaveRealMarketConfigAck> => {
			try {
				if (await isKernalBusy("rocket")) {
					logger.warn("[real_market_config] rocket 忙（运行/更新中），拒绝写入实盘配置")
					return { ok: false, reason: "trading_active" }
				}
				const merged = mergeRealMarketConfig(encodeToWire(uiPartial))
				return { ok: true, config: merged }
			} catch (error) {
				logger.error(`[real_market_config] 保存异常: ${error}`)
				return { ok: false, reason: "exception", error: String(error) }
			}
		},
	)

export const regStoreIPC = () => {
	setStoreIPC()
	getStoreIPC()
	deleteStoreIPC()
	saveRealMarketConfigIPC()
	console.log("[reg] store-ipc")
}
