/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import {
	StartupCheckDialog,
	type StartupCheckStep,
} from "@/renderer/components/StartupCheckDialog"
import { useMemo, useState } from "react"

const { checkStartupNetwork, checkStartupQmtConnect } = window.electronAPI

export function StartupCheckLauncher() {
	const [open, setOpen] = useState(true)

	const steps = useMemo<StartupCheckStep[]>(
		() => [
			{
				id: "network",
				title: "网络连接",
				description: "ping 一下百度，确认客户端可访问外网",
				run: async () => {
					const res = await checkStartupNetwork()
					return {
						ok: res.ok,
						detail: res.detail ?? res.message,
					}
				},
			},
			{
				id: "qmt",
				title: "QMT 连通性",
				description: "调用 fuel qmt_connect_check，确认 QMT 可连接与订阅",
				run: async () => {
					const res = await checkStartupQmtConnect()
					return {
						ok: res.ok,
						detail: res.detail ?? res.message,
					}
				},
			},
		],
		[],
	)

	return <StartupCheckDialog open={open} onOpenChange={setOpen} steps={steps} />
}
