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
import { useEffect } from "react"

export default function ResearchFrameworkSourcePage() {
	useEffect(() => {
		void window.electronAPI.writeFrameworkClientEnv()
	}, [])

	return (
		<ResearchCenterPage
			apiType="basic-code"
			title="框架源码"
			description="管理本地已下载的框架源码，或下载新版本到框架库"
		/>
	)
}
