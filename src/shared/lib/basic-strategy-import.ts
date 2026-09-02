/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

/** 基础版选股策略导入字段白名单 */
export const BASIC_SELECT_STRATEGY_IMPORT_LIMIT = 2

export const BASIC_SELECT_STRATEGY_ALLOWED_KEYS = [
	"name",
	"cap_weight",
	"info",
	"select_num",
	"hold_period",
	"rebalance_time",
	"factor_list",
	"filter_list",
] as const

export type BasicSelectStrategyAllowedKey =
	(typeof BASIC_SELECT_STRATEGY_ALLOWED_KEYS)[number]

const ALLOWED_KEY_SET = new Set<string>(BASIC_SELECT_STRATEGY_ALLOWED_KEYS)

export function getForbiddenBasicStrategyKeys(
	strategy: Record<string, unknown>,
): string[] {
	return Object.keys(strategy).filter((key) => !ALLOWED_KEY_SET.has(key))
}

export type BasicSelectStockImportValidationResult =
	| { ok: true }
	| { ok: false; error: string }

/** validtae 基础版选股策略导入 */
export function validateBasicSelectStockImport(
	strategyList: unknown,
): BasicSelectStockImportValidationResult {
	if (!Array.isArray(strategyList)) {
		return { ok: false, error: "导入失败：strategy_list 格式无效" }
	}

	for (let index = 0; index < strategyList.length; index++) {
		const item = strategyList[index]
		if (typeof item !== "object" || item === null || Array.isArray(item)) {
			return {
				ok: false,
				error: `导入失败：第 ${index + 1} 条策略格式无效`,
			}
		}

		const forbidden = getForbiddenBasicStrategyKeys(
			item as Record<string, unknown>,
		)
		if (forbidden.length > 0) {
			const name = (item as Record<string, unknown>).name
			const label =
				typeof name === "string" && name.trim() ? name : `#${index + 1}`
			return {
				ok: false,
				error: `导入失败：策略「${label}」包含基础版不支持的字段：${forbidden.join("、")}`,
			}
		}
	}

	return { ok: true }
}
