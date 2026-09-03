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
	// 个股日线择时
	"code",
	"code_type",
	"timing",
	// 轮动
	"code_list",
	"rotation",
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

/** validate 基础版选股策略导入 */
export function validateBasicSelectStrategy(
	strategy: unknown,
): BasicSelectStockImportValidationResult {
	if (
		typeof strategy !== "object" ||
		strategy === null ||
		Array.isArray(strategy)
	) {
		return { ok: false, error: "导入失败：strategy 格式无效" }
	}

	const forbidden = getForbiddenBasicStrategyKeys(
		strategy as Record<string, unknown>,
	)
	if (forbidden.length > 0) {
		const name = (strategy as Record<string, unknown>).name
		const label = typeof name === "string" && name.trim() ? name : "策略"
		return {
			ok: false,
			error: `导入失败：策略「${label}」包含基础版不支持的字段：${forbidden.join("、")}`,
		}
	}

	return { ok: true }
}
