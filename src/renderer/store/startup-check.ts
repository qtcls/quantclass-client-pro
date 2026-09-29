/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

// 客户端启动时是否自动执行自检，默认开启
export const startupCheckEnabledAtom = atomWithStorage<boolean>(
	"startupCheckEnabled",
	true,
	undefined,
	{ getOnInit: true },
)

// 递增以触发一次手动自检
export const startupCheckManualTriggerAtom = atom(0)
