/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */
import type { RealMarketConfigSchema } from "@/renderer/page/trading/config-form"
import type { RebTimeConfig, SelectStgType } from "@/renderer/types/strategy"
import { decodeToUi } from "@/shared/lib/real-market-config-codec"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { z } from "zod"

// 版本提示列表
export const versionListAtom = atomWithStorage<string[]>(
	"versionList",
	[],
	undefined,
	{ getOnInit: true },
)
export const backtestConfigAtom = atomWithStorage<{
	initial_cash: number
	start_date: Date
	end_date: Date | undefined
	backtest_name: string
}>(
	"backtestConfig",
	{
		initial_cash: 1000000,
		start_date: new Date(new Date().setFullYear(new Date().getFullYear() - 10)),
		end_date: new Date(),
		backtest_name: "默认策略",
	},
	undefined,
	{ getOnInit: true },
)
export const showDataSubModalAtom = atom(false)
export const isLoginAtom = atom(false)
export const totalWeightAtom = atomWithStorage<number>(
	"totalWeight25",
	0,
	undefined,
	{
		getOnInit: true,
	},
)

export const statusExpiresAtom = atomWithStorage<string>(
	"statusExpires",
	"",
	undefined,
	{ getOnInit: true },
)

// 选股策略
export const selectStgListAtom = atomWithStorage<SelectStgType[]>(
	"selectStockStrategy25",
	[],
	undefined,
	{ getOnInit: true },
)

// 资金曲线再择时（选股模式下）
export const reTimingAtom = atomWithStorage<{
	name: string
	params: any[]
} | null>("reTiming", null, undefined, { getOnInit: true })

// 选股策略信息，可以认为是dict版本的list，是list的另一种形态
export const selectStgDictAtom = atomWithStorage<Record<string, any>>(
	"selectStockStrategyInfo25",
	{},
	undefined,
	{ getOnInit: true },
)

// 仓位策略
export const fusionAtom = atomWithStorage<any[]>("fusion", [], undefined, {
	getOnInit: true,
})

// 换仓时间配置，按 rebalance_time 分组
export const rebTimeConfigAtom = atomWithStorage<Record<string, RebTimeConfig>>(
	"rebTimeConfig",
	{},
	undefined,
	{ getOnInit: true },
)

export const libraryTypeAtom = atomWithStorage<string>(
	"libraryType",
	"select",
	undefined,
	{ getOnInit: true },
)

export const accountKeyAtom = atomWithStorage<{
	apiKey: string
	uuid: string
}>(
	"accountKey",
	{
		apiKey: "",
		uuid: "",
	},
	undefined,
	{ getOnInit: true },
)

export const isAutoLoginAtom = atomWithStorage<boolean>(
	"isAutoLogin",
	true,
	undefined,
	{ getOnInit: true },
)

// export const isAutoRocketAtom = atomWithStorage<boolean>(
// 	"isAutoRocket",
// 	false,
// 	undefined,
// 	{ getOnInit: true },
// )

// -- S2a：实盘配置 UI 投影（纯内存，单一权威源为 config.json）。
// -- 不再用 atomWithStorage 平行持久化（消除"两持久化 key、两编码"的静默分叉）；
// -- 由 useLifeCycle boot 与 saveRealMarketConfig 的 ack 从 config.json 经 decodeToUi 水合。
// -- 初值由 codec 默认派生（decodeToUi(undefined)），避免默认值在 atom 与 codec 两处漂移。
export const realMarketConfigSchemaAtom = atom<
	Partial<z.infer<typeof RealMarketConfigSchema>>
>(decodeToUi(undefined))

// -- S2a：config.json → schema atom 水合完成标志。
// -- 水合前实盘配置仅为内存默认值，禁止保存/启动实盘（fail-closed，避免用默认值覆盖 config.json）。
export const configHydratedAtom = atom(false)

export const showMoneyAtom = atomWithStorage<boolean>(
	"showMoney",
	true,
	undefined,
	{ getOnInit: true },
)

// 中金是否已点击「我已知晓不再提示」
export const ciccBseNoticeDismissedAtom = atomWithStorage<boolean>(
	"ciccBseNoticeDismissed",
	false,
	undefined,
	{ getOnInit: true },
)
