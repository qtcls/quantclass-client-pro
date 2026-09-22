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

export const storeIPC = {
	// 基本存储操作
	setStoreValue: (key: string, value: any) =>
		ipcRenderer.invoke("set-store", key, value),
	getStoreValue: (key: string, defaultValue: any = {}) =>
		ipcRenderer.invoke("get-store", key, defaultValue),
	deleteStoreValue: (key: string) => ipcRenderer.invoke("delete-store", key),

	// aqua trading info
	loadAquaTradingInfo: () => ipcRenderer.invoke("load-aqua-trading-info"),
}
