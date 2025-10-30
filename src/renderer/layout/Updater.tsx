/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { Button } from "@/renderer/components/ui/button"
import { Progress } from "@/renderer/components/ui/progress"
import { ScrollArea } from "@/renderer/components/ui/scroll-area"
import { UpdateStatus } from "@/renderer/context/update-context"
import { useAppUpdate } from "@/renderer/hooks/useAppUpdate"
import { formatBytes } from "@/renderer/utils/formatBytes"
import type { UpdateInfo } from "electron-updater"
import { Download, Loader } from "lucide-react"
import type { FC } from "react"
import ReactMarkdown from "react-markdown"

export interface IUpdaterProps {
	updateInfo?: UpdateInfo
}

const Updater: FC<IUpdaterProps> = ({ updateInfo }) => {
	const { status, progress, confirmCallback } = useAppUpdate()

	return (
		<>
			{status === UpdateStatus.Downloading && (
				<div className="fixed inset-0 z-[9] flex h-screen w-screen flex-col items-center justify-center gap-2 bg-background">
					<Loader className="animate-spin w-12 h-12" />
					<h2 className="text-lg">下载安装包中...</h2>

					<div className="flex items-center gap-2 w-2/3">
						<Progress value={progress?.percent} className="flex-grow" />
						<p className="min-w-32">
							{formatBytes(progress?.bytesPerSecond!)} /s
						</p>
					</div>
				</div>
			)}
			{status === UpdateStatus.Confirm && (
				<div className="fixed inset-0 z-[19] flex h-[calc(100vh-2.5rem)] mt-10 w-screen flex-col items-center justify-center gap-2 bg-background">
					<div className="flex flex-col h-[calc(100vh-2.5rem)] bg-background text-foreground p-6 w-full pt-10">
						<header className="flex items-center gap-4 mb-6">
							<h1 className="text-2xl font-bold">更新日志</h1>
							<Button
								variant="outline"
								className="text-sm px-3 py-1"
								onClick={() => confirmCallback(true)}
							>
								<Download className="w-4 h-4 mr-2" />
								下载完成,点击重启
							</Button>
						</header>

						<ScrollArea className="flex-grow w-full h-2/3 border dark:border-white/30 border-black/20 p-2 px-3 rounded-md bg-gray-50 dark:bg-gray-900">
							<div className="flex flex-col gap-2">
								<ReactMarkdown
									components={{
										h1: (props) => (
											<h1 className="text-xl font-bold" {...props} />
										),
									}}
								>
									{updateInfo?.releaseNotes as string}
								</ReactMarkdown>
							</div>
						</ScrollArea>
					</div>
				</div>
			)}
			{(status === UpdateStatus.Done || status === UpdateStatus.Waiting) &&
				null}
		</>
	)
}

export default Updater
