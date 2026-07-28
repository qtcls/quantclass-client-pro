/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

// 手工选股结果 JSON
export interface ManualStockSelectResultItem {
	选股日期: string
	股票代码: string
}

export interface ManualStockSelectLoadResult {
	success: boolean
	data: ManualStockSelectResultItem[]
	message?: string
}
