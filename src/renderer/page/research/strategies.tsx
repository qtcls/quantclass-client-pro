/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { ResearchCenterPage } from "@/renderer/page/research"

export default function ResearchStrategyLibraryPage() {
	return (
		<ResearchCenterPage
			apiType="strategies"
			title="精心随机策略库"
			description="管理本地已下载的精心随机策略，或下载新版本到策略库"
		/>
	)
}
