/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { isWindows } from "@/renderer/constant"
import { useHotkeys } from "@/renderer/hooks/useHotkeys"
import { Minus, Square, X } from "lucide-react"
import Img from "../../../build/icon.ico"
import ButtonTooltip from "../components/ui/button-tooltip"
import { cn } from "../lib/utils"

const { minimizeApp, closeApp, focusMainWindows, handleToggleFullscreen } =
	window.electronAPI

const LogWindowBar = () => {
	useHotkeys([
		[
			"mod+`",
			async () => {
				await minimizeApp("terminal")
				await focusMainWindows()
			},
		],
	])

	return (
		<>
			{
				<div
					className={cn(
						"app-drag-region flex items-center justify-between h-10 bg-background select-none w-screen border-b pr-2 flex-shrink-0",
						isWindows ? "" : "pl-20",
					)}
				>
					<div className="flex items-center justify-center">
						{isWindows && (
							<div className="flex items-center px-2">
								<img src={Img} alt="App Icon" className="w-4 h-4 mr-2" />
								<span className="text-foreground text-sm">
									量化小讲堂内核日志
								</span>
							</div>
						)}
					</div>

					{isWindows && (
						<div className="window-control-region flex items-center gap-4">
							<ButtonTooltip content="最小化">
								<div
									className="hover:cursor-pointer text-foreground hover:text-foreground/80"
									onClick={() => minimizeApp("terminal")}
								>
									<Minus className="w-5 h-5" />
								</div>
							</ButtonTooltip>
							<ButtonTooltip content="最大化">
								<div
									className="hover:cursor-pointer text-foreground hover:text-foreground/80"
									onClick={() => handleToggleFullscreen("terminal")}
								>
									<Square className="w-4 h-4" />
								</div>
							</ButtonTooltip>
							<ButtonTooltip content="关闭">
								<div
									className="hover:cursor-pointer text-foreground hover:text-foreground/80"
									onClick={() => closeApp("terminal")}
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

export default LogWindowBar
