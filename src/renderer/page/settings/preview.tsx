/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { H3 } from "@/renderer/components/ui/typography"
import { SETTINGS_PAGE } from "@/renderer/constant"
import { useSettings } from "@/renderer/hooks/useSettings"
import { isAutoLoginAtom } from "@/renderer/store/storage"
import { useAtomValue } from "jotai"
import { Bot } from "lucide-react"
import { useNavigate } from "react-router"
export function SelfStarting() {
	const isAutoLogin = useAtomValue(isAutoLoginAtom)
	const { settings } = useSettings()
	const navigate = useNavigate()
	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<Bot size={26} />
				<H3>开机自启动设置</H3>
			</div>
			<div className="flex flex-col xl:flex-row xl:justify-between xl:items-center justify-start items-start space-y-2 pb-2">
				<div
					className="flex items-center cursor-pointer"
					onClick={() => navigate(SETTINGS_PAGE)}
				>
					<div>开机自动打开客户端：</div>
					<div>{isAutoLogin ? "✅" : "🈚️"}</div>
				</div>
				<div
					className="flex items-center cursor-pointer"
					onClick={() => navigate(SETTINGS_PAGE)}
				>
					<div>开机启动自动更新历史数据：</div>
					<div>{settings.is_auto_launch_update ? "✅" : "🈚️"}</div>
				</div>
				<div
					className="flex items-center cursor-pointer"
					onClick={() => navigate(SETTINGS_PAGE)}
				>
					<div>开机启动自动更新实时数据：</div>
					<div>{settings.is_auto_launch_min_data ? "✅" : "🈚️"}</div>
				</div>
				<div
					className="flex items-center cursor-pointer"
					onClick={() => navigate(SETTINGS_PAGE)}
				>
					<div>开机启动自动实盘：</div>
					<div>{settings.is_auto_launch_real_trading ? "✅" : "🈚️"}</div>
				</div>
			</div>
		</div>
	)
}
