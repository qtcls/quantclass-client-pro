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
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/renderer/components/ui/alert-dialog"
import { Button } from "@/renderer/components/ui/button"
import ButtonTooltip from "@/renderer/components/ui/button-tooltip"
import { Eraser } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"
import type { FallbackProps } from "react-error-boundary"
import { ErrorBoundary } from "react-error-boundary"
import { toast } from "sonner"

const { openUrl } = window.electronAPI

const ErrorFallback = ({ error }: FallbackProps): JSX.Element => {
	const [isClear, setIsClear] = useState(false)
	const clearAllData = () => {}
	return (
		<div className="p-4">
			<h2 className="my-2 text-lg font-bold">
				{"应用崩溃了 :( 请将以下信息提交给开发者以排查错误"}
			</h2>
			<ButtonTooltip content="清除数据">
				<Button
					variant="ghost"
					size="icon"
					className="focus-visible:outline-none focus-visible:ring-transparent"
					onClick={() => setIsClear(true)}
				>
					<Eraser className="h-4 w-4 text-foreground hover:cursor-pointer" />
				</Button>
			</ButtonTooltip>
			<Button
				size="sm"
				variant="outline"
				onClick={() => window.location.reload()}
				className="mr-2"
			>
				刷新当前页面
			</Button>

			<Button
				size="sm"
				variant="outline"
				onClick={() => window.location.replace("/")}
				className="mr-2"
			>
				返回首页
			</Button>

			<Button
				size="sm"
				variant="outline"
				onClick={() => openUrl("https://bbs.quantclass.cn/thread/48835")}
			>
				去论坛反馈
			</Button>

			<Button
				size="sm"
				variant="outline"
				className="ml-2"
				onClick={() =>
					navigator.clipboard.writeText(
						`\`\`\`\n${error.message}\n${error.stack}\n\`\`\``,
					)
				}
			>
				复制报错信息
			</Button>

			<p className="my-2">{error.message}</p>

			<details title="Error Stack">
				<summary>Error Stack</summary>
				<pre>{error.stack}</pre>
			</details>
			<AlertDialog open={isClear} onOpenChange={setIsClear}>
				<AlertDialogContent className="p-4">
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center">
							<Eraser className="mr-2" /> 确认清空数据吗？
						</AlertDialogTitle>
						<AlertDialogDescription className="py-1 leading-loose">
							<span>※ 所有数据都会消失，</span>
							<br />
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>取消</AlertDialogCancel>
						<Button
							onClick={() => {
								clearAllData()
								toast.success("清除成功")
							}}
						>
							确定
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

interface Props {
	children?: ReactNode
}

const BaseErrorBoundary = (props: Props): JSX.Element => {
	return (
		<ErrorBoundary FallbackComponent={ErrorFallback}>
			{props.children}
		</ErrorBoundary>
	)
}

export default BaseErrorBoundary
