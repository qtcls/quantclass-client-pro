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
import type { RealMarketConfigUi } from "@/shared/lib/real-market-config-codec.js"
import type {
	SaveRealMarketConfigAck,
	SaveRealMarketDataAck,
} from "@/shared/types/trading.js"
import { ipcRenderer } from "electron"

export const storeIPC = {
	// 基本存储操作
	setStoreValue: (key: string, value: any) =>
		ipcRenderer.invoke(IPC_CHANNELS.SET_STORE, key, value),
	getStoreValue: (key: string, defaultValue: any = {}) =>
		ipcRenderer.invoke(IPC_CHANNELS.GET_STORE, key, defaultValue),
	deleteStoreValue: (key: string) =>
		ipcRenderer.invoke(IPC_CHANNELS.DELETE_STORE, key),

	// 实盘配置 real_market_config 唯一权威写入通道（S2a 单源化）
	saveRealMarketConfig: (
		uiPartial: Partial<RealMarketConfigUi>,
	): Promise<SaveRealMarketConfigAck> =>
		ipcRenderer.invoke(IPC_CHANNELS.SAVE_REAL_MARKET_CONFIG, uiPartial),

	// 从renderer/ipc/store.ts迁移的实盘数据方法
	// real_market_25.json 唯一写入通道（S2b 原子全量替换 + 失败回滚 + ack）
	saveRealMarketData: (
		data: Record<string, any>,
	): Promise<SaveRealMarketDataAck> =>
		ipcRenderer.invoke(IPC_CHANNELS.SAVE_REAL_MARKET_DATA, data),
	clearRealMarketData: () =>
		ipcRenderer.invoke(IPC_CHANNELS.CLEAR_REAL_MARKET_DATA),
	cleanRealMarketData: (keys: string[]) =>
		ipcRenderer.invoke(IPC_CHANNELS.CLEAN_REAL_MARKET_DATA, keys),

	// aqua trading info
	loadAquaTradingInfo: () =>
		ipcRenderer.invoke(IPC_CHANNELS.LOAD_AQUA_TRADING_INFO),
}
