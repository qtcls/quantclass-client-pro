/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { RefreshCw } from "lucide-react"
import type { FC, ReactNode } from "react"
import { Button } from "../ui/button"

const { createTerminalWindow } = window.electronAPI

export interface ILoadingAnimeProps {
	loading: boolean
	content?: ReactNode
	type?: string
}

const LoadingAnime: FC<ILoadingAnimeProps> = ({
	loading,
	type,
	content = "更新中...",
}) => {
	return (
		<>
			{loading && (
				<div className="fixed inset-0 z-[9] flex h-[calc(100vh-2.5rem)] top-10 w-screen flex-col items-center justify-center gap-2 bg-background">
					<RefreshCw className="animate-spin" />
					<h2 className="text-lg">{content}</h2>
					<p className="text-xs text-muted-foreground">
						{type === "kernalUpdate" ? "正在检查并更新内核" : "正在计算中"}
						...可能会花费几分钟时间，完成后会自动关闭返回上次操作页面，请耐心等待
					</p>
					{type !== "kernalUpdate" && (
						<Button size="sm" onClick={() => createTerminalWindow()}>
							显示运行详情
						</Button>
					)}
				</div>
			)}
		</>
	)
}

export default LoadingAnime
