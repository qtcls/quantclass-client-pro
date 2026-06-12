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
import { type OpenDialogOptions, ipcRenderer } from "electron"

export const fileSysIPC = {
	openUrl: (url: string) => ipcRenderer.send(IPC_CHANNELS.OPEN_URL, url),
	openDirectory: (path: string[]) =>
		ipcRenderer.invoke(IPC_CHANNELS.OPEN_DIRECTORY, path),
	openDataDirectory: (path?: string[] | string) =>
		ipcRenderer.invoke(IPC_CHANNELS.OPEN_DATA_DIRECTORY, path),
	openUserDirectory: (path?: string[] | string) =>
		ipcRenderer.invoke(IPC_CHANNELS.OPEN_USER_DIRECTORY, path),
	// -- S4：get/set/deleteStoreValue 三元组改由 storeIPC 唯一提供
	// --（原与 store 域双暴露同一频道，spread 后置者胜出，去重后行为等价）
	createRealTradingDir: (dirName = "real_trading") =>
		ipcRenderer.invoke(IPC_CHANNELS.CREATE_REAL_TRADING_DIR, dirName),
	selectDirectory: (
		properties: OpenDialogOptions["properties"] = ["openDirectory"],
		opts: OpenDialogOptions = {},
	) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_DIRECTORY_SELECT, properties, opts),
	selectFile: (opts: OpenDialogOptions = {}) =>
		ipcRenderer.invoke(IPC_CHANNELS.OPEN_DIRECTORY_SELECT, ["openFile"], opts),
	importSelectStock: (configFilePath: string) =>
		ipcRenderer.invoke(IPC_CHANNELS.IMPORT_SELECT_STOCK, configFilePath),
	importFusion: (configFilePath: string) =>
		ipcRenderer.invoke(IPC_CHANNELS.IMPORT_FUSION, configFilePath),
	readChangelog: () => ipcRenderer.invoke(IPC_CHANNELS.READ_CHANGELOG),
	loadPositionJson: (filename: string) =>
		ipcRenderer.invoke(IPC_CHANNELS.LOAD_POSITION_JSON, filename),
	deletePeriodOffset: () =>
		ipcRenderer.invoke(IPC_CHANNELS.DELETE_PERIOD_OFFSET),
	clearFactorCache: () => ipcRenderer.invoke(IPC_CHANNELS.CLEAR_FACTOR_CACHE),
}
