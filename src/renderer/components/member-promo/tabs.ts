/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export const MEMBER_PROMO_TAB_IDS = [
	"intro",
	"random-strategy",
	"config-master",
	"blacklist",
	"fusion-library",
	"exclusive",
] as const

export type MemberPromoTabId = (typeof MEMBER_PROMO_TAB_IDS)[number]

export interface MemberPromoTabDef {
	id: MemberPromoTabId
	label: string
}

export const MEMBER_PROMO_TABS: MemberPromoTabDef[] = [
	{ id: "intro", label: "分享会介绍" },
	{ id: "random-strategy", label: "精心随机策略库" },
	{ id: "config-master", label: "Config大师" },
	{ id: "blacklist", label: "条件黑名单" },
	{ id: "fusion-library", label: "分享会专属策略库" },
	{ id: "exclusive", label: "分享会策略专属功能" },
]

const DEFAULT_TAB: MemberPromoTabId = "intro"

const FEATURE_TO_TAB: Record<string, MemberPromoTabId> = {
	投研中心: "random-strategy",
	精心随机策略库: "random-strategy",
	Config大师: "config-master",
	"config 大师": "config-master",
	买入黑名单: "blacklist",
	"条件不买入（涨跌幅限制）": "blacklist",
	条件黑名单: "blacklist",
	综合策略库: "fusion-library",
	分享会专属策略库: "fusion-library",
	分享会专属功能: "exclusive",
	后置过滤因子: "exclusive",
	截面因子: "exclusive",
	"择时开仓/离场": "exclusive",
	换仓时间点: "exclusive",
	个股择时: "exclusive",
	分享会介绍: "intro",
}

export function getMemberPromoTabId(featureName?: string): MemberPromoTabId {
	if (!featureName) return DEFAULT_TAB
	return FEATURE_TO_TAB[featureName] ?? DEFAULT_TAB
}
