/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export interface NotificationWeComConfig {
	// 免打扰开关
	dndEnabled: boolean
	// 免打扰开始时间 HH:mm
	dndStart: string
	// 免打扰结束时间 HH:mm
	dndEnd: string
	// 数据内核（fuel）推送企微
	dataKernelEnabled: boolean
	// 非数据内核（rocket/fusion/client）推送企微
	nonDataKernelEnabled: boolean
	// 同一 event 每日推送上限
	dailyLimit: number
}
