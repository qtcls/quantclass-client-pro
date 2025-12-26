/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { APP_VERSION_YEAR, isWindows } from "@/renderer/constant"
// import { BoxIcon } from "@radix-ui/react-icons"
import { useAtomValue } from "jotai"
import { Maximize2, Minimize2, Minus, X } from "lucide-react"
// @ts-ignore
import Img from "../../../build/icon.ico"
import { Badge } from "../components/ui/badge"
import ButtonTooltip from "../components/ui/button-tooltip"
import { cn } from "../lib/utils"
import { isFullscreenAtom } from "../store"

const WindowsBar = ({ toggleFullscreen }: { toggleFullscreen: () => void }) => {
	const isMaximized = useAtomValue(isFullscreenAtom)
	const { closeApp, minimizeApp } = window.electronAPI

	const handleMaximize = () => {
		toggleFullscreen()
	}

	return (
		<>
			{
				<div
					className={cn(
						"app-drag-region flex items-center justify-between h-10 bg-background select-none w-full border-b pr-2",
						isWindows ? "" : "pl-20",
					)}
				>
					<div className="flex items-center justify-center">
						{isWindows && (
							<div className="flex items-center px-2">
								<img src={Img} alt="App Icon" className="w-4 h-4 mr-2" />
								<span className="text-foreground text-sm">
									量化小讲堂客户端
								</span>
								<Badge variant={"default"} className="ml-2">
									{APP_VERSION_YEAR}版
								</Badge>
							</div>
						)}
					</div>

					{isWindows && (
						<div className="window-control-region flex items-center gap-4">
							<ButtonTooltip content="最小化">
								<div
									className="hover:cursor-pointer text-foreground hover:text-foreground/80"
									onClick={() => minimizeApp()}
								>
									<Minus className="w-5 h-5" />
								</div>
							</ButtonTooltip>
							<ButtonTooltip content={isMaximized ? "还原" : "全屏"}>
								<div
									className="hover:cursor-pointer text-foreground hover:text-foreground/80"
									onClick={handleMaximize}
								>
									{isMaximized ? (
										<Minimize2 className="w-5 h-5 fill-foreground" />
									) : (
										<Maximize2 className="w-5 h-5" />
									)}
								</div>
							</ButtonTooltip>
							<ButtonTooltip content="关闭">
								<div
									className="hover:cursor-pointer text-foreground hover:text-foreground/80"
									onClick={() => closeApp("main")}
								>
									<X className="w-5 h-5" />
								</div>
							</ButtonTooltip>
						</div>
					)}
				</div>
			}
		</>
	)
}

export default WindowsBar
