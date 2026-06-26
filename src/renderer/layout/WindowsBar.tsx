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
import { useOpenLoginWindow } from "@/renderer/layout/hooks/useOpenLoginWindow"
import { cn } from "@/renderer/lib/utils"
import { userAtom } from "@/renderer/store/user"
// import { BoxIcon } from "@radix-ui/react-icons"
import { useAtomValue } from "jotai"
import { Maximize2, Minimize2, Minus, X } from "lucide-react"
// @ts-ignore
import Img from "../../../build/icon.ico"
import { Badge } from "../components/ui/badge"
import ButtonTooltip from "../components/ui/button-tooltip"
import { GlowDot } from "../components/ui/glow-dot"
import { isFullscreenAtom } from "../store"
import { MonitorStrip } from "./MonitorStrip"

const WindowsBar = ({ toggleFullscreen }: { toggleFullscreen: () => void }) => {
	const isMaximized = useAtomValue(isFullscreenAtom)
	const { isLoggedIn } = useAtomValue(userAtom)
	const { requestLogin, canOpenLogin } = useOpenLoginWindow()
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
								{!isLoggedIn && (
									<button
										type="button"
										title={
											canOpenLogin
												? "点击打开登录窗口"
												: "客户端未就绪，请稍后再试"
										}
										className={cn(
											"window-control-region ml-2 inline-flex items-center rounded-md",
											canOpenLogin &&
												"cursor-pointer hover:opacity-90 focus-visible:outline focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
											!canOpenLogin && "cursor-not-allowed opacity-60",
										)}
										disabled={!canOpenLogin}
										onClick={requestLogin}
									>
										<div className="relative w-fit max-w-full">
											<Badge
												variant="destructive"
												className="pointer-events-none select-none shadow-sm"
											>
												<span className="font-semibold leading-snug">
													未登录
												</span>
											</Badge>
											<GlowDot
												color="red"
												size="sm"
												visible
												className="absolute -top-0.5 -right-4"
											/>
										</div>
									</button>
								)}
							</div>
						)}
					</div>

					<div className="flex-1 min-w-0" />

					<MonitorStrip />

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
