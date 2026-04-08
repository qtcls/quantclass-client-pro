/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { getJsonDataFromFile } from "@/main/core/dataList.js"
import logger from "@/main/utils/wiston.js"
import { SELECT_UI_VIEWS_PATH } from "@/main/vars.js"
import type {
	StockTimingMatrixRow,
	StockTimingStrategyBlock,
	StockTimingTimeSlot,
	StockTimingViewMatrix,
	StockTimingViewRow,
} from "@/shared/types/stock-timing-view.js"

async function detectViewSelectKernel(date: string): Promise<"aqua" | "zeus"> {
	const aquaPath = [...SELECT_UI_VIEWS_PATH, `aqua-views-${date}.json`]
	const aquaData = await getJsonDataFromFile<unknown>(aquaPath, "", null)
	if (Array.isArray(aquaData)) {
		return "aqua"
	}

	return "zeus"
}

const TIME_TO_SLOT: Record<string, StockTimingTimeSlot> = {
	"09:30:00": "0930",
	"10:30:00": "1030",
	"13:00:00": "1300",
	"14:00:00": "1400",
}

const ROW_KEY_SEP = "\u0000"

function emptySignals(): Record<StockTimingTimeSlot, number | null> {
	return {
		"0930": null,
		"1030": null,
		"1300": null,
		"1400": null,
	}
}

function parseTradeDateParts(
	tradeDate: string,
): { datePart: string; timePart: string } | null {
	const trimmed = tradeDate.trim()
	const space = trimmed.indexOf(" ")
	if (space === -1) return null
	const datePart = trimmed.slice(0, space)
	const rest = trimmed.slice(space + 1).trim()
	if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null
	const timePart = rest.length >= 8 ? rest.slice(0, 8) : rest
	return { datePart, timePart }
}

// 将原始行聚合成策略
export function rowsToStockTimingMatrix(
	rows: StockTimingViewRow[],
	date: string,
): StockTimingViewMatrix {
	type RowAgg = {
		stockName: string
		stockCode: string
		offset: string
		signals: Record<StockTimingTimeSlot, number | null>
	}

	const byStrategy = new Map<string, Map<string, RowAgg>>()

	for (const row of rows) {
		const parts = parseTradeDateParts(row.trade_date)
		if (!parts || parts.datePart !== date) continue

		const slot = TIME_TO_SLOT[parts.timePart]
		if (!slot) {
			logger.warn(
				`[stock-timing-view] 跳过无法映射时间槽的记录: trade_date=${row.trade_date} strategy=${row.strategy_name} stock=${row.stock_code}`,
			)
			continue
		}

		const strategyName = row.strategy_name ?? ""
		const stockCode = row.stock_code ?? ""
		const offset = row.offset ?? ""
		const rowKey = `${stockCode}${ROW_KEY_SEP}${offset}`

		let strategyMap = byStrategy.get(strategyName)
		if (!strategyMap) {
			strategyMap = new Map()
			byStrategy.set(strategyName, strategyMap)
		}

		let agg = strategyMap.get(rowKey)
		if (!agg) {
			agg = {
				stockName: row.stock_name ?? "",
				stockCode,
				offset,
				signals: emptySignals(),
			}
			strategyMap.set(rowKey, agg)
		} else if (row.stock_name) {
			agg.stockName = row.stock_name
		}

		agg.signals[slot] = row.signal
	}

	const strategyNames = [...byStrategy.keys()].sort((a, b) =>
		a.localeCompare(b, "zh-CN"),
	)

	const result: StockTimingStrategyBlock[] = strategyNames.map(
		(strategyName) => {
			const strategyMap = byStrategy.get(strategyName)!
			const rowKeys = [...strategyMap.keys()].sort((a, b) => {
				const [ca, oa] = a.split(ROW_KEY_SEP)
				const [cb, ob] = b.split(ROW_KEY_SEP)
				const c = ca.localeCompare(cb, "zh-CN")
				return c !== 0 ? c : oa.localeCompare(ob, "zh-CN")
			})

			const stocks: StockTimingMatrixRow[] = rowKeys.map((key) => {
				const agg = strategyMap.get(key)!
				return {
					stockName: agg.stockName,
					stockCode: agg.stockCode,
					offset: agg.offset,
					signals: { ...agg.signals },
				}
			})

			return { strategyName, stocks }
		},
	)

	return result
}

export async function getStockTimingViewMatrix(
	date: string,
): Promise<StockTimingViewMatrix> {
	const kernel = await detectViewSelectKernel(date)
	const filePath = [...SELECT_UI_VIEWS_PATH, `${kernel}-views-${date}.json`]

	const raw = await getJsonDataFromFile<StockTimingViewRow[]>(
		filePath,
		`读取个股择时视图失败: ${filePath.join("/")}`,
		[],
	)

	if (!Array.isArray(raw)) {
		return []
	}

	const rows = raw
	return rowsToStockTimingMatrix(rows, date)
}
