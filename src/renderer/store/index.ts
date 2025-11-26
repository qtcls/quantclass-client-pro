/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { DATA_TAB_NAME } from "@/renderer/constant"
import dayjs from "dayjs"
import { atom } from "jotai"
interface RecordType {
	key: string
	title: string
	fullData: string
	description: string
}

export const isShowSpotlightAtom = atom(false)

export const isFullscreenAtom = atom(false)

export const isUpdatingAtom = atom(false)
export const isAutoRocketAtom = atom(false)

export const fuelOutPutAtom = atom(
	`<div class="w-full text-center">---------------------${String(
		dayjs(new Date()).format("YYYY-MM-DD HH:mm:ss"),
	)}---------------------</div> \n`,
)

export const realMarketOutputAtom = atom(
	`<div class="w-full text-center">---------------------${String(
		dayjs(new Date()).format("YYYY-MM-DD HH:mm:ss"),
	)}---------------------</div> \n`,
)

export const csvFileNameAtom = atom("最新选股结果")

export const stepAtom = atom(0)

export const sizeAtom = atom(75)

export const rowSelectionAtom = atom<Record<string, boolean>>({})

export const kanbanRowSelectionAtom = atom<Record<string, boolean>>({})

export const transferAtom = atom<RecordType[]>([])

export const remoteVersionAtom = atom<string>("")

export const downloadLinkAtom = atom<string>("")

export const settingDataKeysAtom = atom<any[]>([])

export const strategyAtom = atom<any[]>([])

export const hasNetworkAtom = atom<boolean>(true)

export const isShowMonitorPanelAtom = atom<boolean>(false)

export const actionDialogAtom = atom<boolean>(false)

export const activeTabAtom = atom<string>(DATA_TAB_NAME)

export const loadingAnimeAtom = atom<boolean>(false)

export const realTradingTabAtom = atom<string>("tradingPlan")

export const errAlertAtom = atom<boolean>(false)

export const terminalTabAtom = atom<string>("fuel")

export const realConfigEditModalAtom = atom<boolean>(false) // 实盘配置页面的modal

// 存储每个任务的 step loader 显示状态，key 是任务名称
export const stepLoaderMapAtom = atom<Record<string, boolean>>({})
