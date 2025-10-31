/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

// 版本相关类型
export type {
	KernalVersionType,
	AppVersions,
} from "./version.js"

// 内核相关类型
export type { KernalType } from "./kernal.js"

// 用户相关类型
export type {
	UserInfo,
	WebUserInfo,
	UserAccount,
	UserAccountInfo,
} from "./user.js"

// 策略状态相关类型
export type {
	StrategyStatus,
	StrategyStatusTag,
	StrategyStatusPlan,
	StrategyStatusStat,
} from "@/main/core/strategy/index.js"
export { StrategyStatusEnum } from "@/main/core/strategy/index.js"
