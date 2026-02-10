import { processLogUpdate } from "@/renderer/utils/log"
import { ArrowDown, ExternalLink, Trash } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "./ui/button"
import ButtonTooltip from "./ui/button-tooltip"

const {
	watchKernelLog,
	unwatchKernelLog,
	onKernelLogChanged,
	offKernelLogChanged,
	// 独立窗口
	watchIndividualKernelLog,
	unwatchIndividualKernelLog,
	onIndividualKernelLogChanged,
	offIndividualKernelLogChanged,
	createTerminalWindow,
} = window.electronAPI

interface LogViewerProps {
	title: string
	htmlContent: string
	onChange: (updater: (prev: string) => string) => void
	logType: string
	customClass?: string
	isShowExternal?: boolean
	isIndependentWindow?: boolean
}

export function LogViewer({
	title,
	htmlContent,
	onChange,
	logType,
	customClass,
	isShowExternal = false,
	isIndependentWindow = false,
}: LogViewerProps) {
	const viewportRef = useRef<HTMLDivElement>(null)
	const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
	const isAutoScrolling = useRef(false)
	const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const isFirstRender = useRef(true)

	const scrollToBottom = () => {
		if (!shouldAutoScroll) return
		isAutoScrolling.current = true
		if (viewportRef.current) {
			viewportRef.current.scrollTo({
				top: viewportRef.current.scrollHeight,
				behavior: isFirstRender.current ? "instant" : "smooth",
			})
			if (isFirstRender.current) {
				isFirstRender.current = false
			}
		}
		if (scrollTimeoutRef.current) {
			clearTimeout(scrollTimeoutRef.current)
		}
		scrollTimeoutRef.current = setTimeout(() => {
			isAutoScrolling.current = false
		}, 300)
	}

	const checkIfAtBottom = (viewport: HTMLElement) => {
		return (
			viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 2
		)
	}

	const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
		if (isAutoScrolling.current) return
		const viewport = event.currentTarget
		setShouldAutoScroll(checkIfAtBottom(viewport))
	}

	useEffect(() => {
		if (shouldAutoScroll && htmlContent.length > 0) {
			scrollToBottom()
		}
	}, [shouldAutoScroll, htmlContent])

	useEffect(() => {
		if (isIndependentWindow) {
			watchIndividualKernelLog(logType as "fuel" | "rocket" | "select")
		} else {
			watchKernelLog(logType as "fuel" | "rocket" | "select")
		}

		const handler = (
			content: string,
			kernelType: "fuel" | "select" | "rocket",
			isInitial: boolean,
		) => {
			if (logType !== kernelType) return
			if (isInitial) {
				onChange(() => processLogUpdate("", content))
			} else {
				onChange((prev) => processLogUpdate(prev, content))
			}
		}

		// 注册监听器
		if (isIndependentWindow) {
			onIndividualKernelLogChanged(handler)
		} else {
			onKernelLogChanged(handler)
		}

		const cleanup = () => {
			if (isIndependentWindow) {
				unwatchIndividualKernelLog(logType as "fuel" | "rocket" | "select")
				offIndividualKernelLogChanged()
			} else {
				unwatchKernelLog(logType as "fuel" | "rocket" | "select")
				offKernelLogChanged()
			}
		}

		window.addEventListener("beforeunload", cleanup)

		// 清理函数
		return () => {
			window.removeEventListener("beforeunload", cleanup)
			cleanup()
		}
	}, [logType, isIndependentWindow])

	const handleClearLogs = () => {
		onChange(() => "")
	}

	const handleScrollToBottom = () => {
		setShouldAutoScroll(true)
		scrollToBottom()
	}

	const openIndependentWindow = async () => {
		await createTerminalWindow()
	}

	return (
		<div className="flex flex-col min-h-0">
			<div className="px-4 py-2 bg-muted/50 border-b text-sm font-medium flex justify-between items-center">
				<span>{title}</span>
				<div className="flex items-center gap-1">
					{isShowExternal && (
						<Button
							variant="outline"
							size="sm"
							className="h-6 gap-2 text-xs"
							onClick={openIndependentWindow}
						>
							<ExternalLink className="h-3 w-3" />
							独立窗口
						</Button>
					)}
					<ButtonTooltip content="清空日志">
						<Button
							size="icon"
							variant="ghost"
							className="my-auto h-5 w-5"
							onClick={handleClearLogs}
						>
							<Trash size={16} className="text-muted-foreground" />
						</Button>
					</ButtonTooltip>

					<ButtonTooltip content="滚动到底部">
						<Button
							size="icon"
							variant="ghost"
							className="my-auto h-5 w-5"
							onClick={handleScrollToBottom}
						>
							<ArrowDown size={16} className="text-muted-foreground" />
						</Button>
					</ButtonTooltip>
				</div>
			</div>
			<div className="flex-1 min-h-0 pl-2 py-2 pr-1 text-xs">
				<div
					ref={viewportRef}
					className={`overflow-auto scrollbar-ultra-narrow h-full ${customClass}`}
					onScroll={handleScroll}
				>
					<div
						className="font-terminal text-muted-foreground terminal-output leading-4 pr-1"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
						dangerouslySetInnerHTML={{ __html: htmlContent }}
					/>
				</div>
			</div>
		</div>
	)
}
