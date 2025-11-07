/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { Badge } from "@/renderer/components/ui/badge"
import { Button } from "@/renderer/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { usePermissionCheck, useToggleAutoRealTrading } from "@/renderer/hooks"
import { backtestExecTimeAtom } from "@/renderer/store/backtest"
import { monitorProcessesQueryAtom } from "@/renderer/store/query"
import { libraryTypeAtom } from "@/renderer/store/storage"
import { Separator } from "@radix-ui/react-separator"
import { useMutation } from "@tanstack/react-query"
import dayjs from "dayjs"
import duration from "dayjs/plugin/duration"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { LoaderPinwheel, PlayIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import TradeCtrlBtn from "../../components/trade-ctrl-btn"
import { useBacktestResult } from "./context"

dayjs.extend(duration)

// const { execFuelWithEnv } = window.electronAPI

export const BacktestControls = () => {
	const [{ data }] = useAtom(monitorProcessesQueryAtom)
	const isRunning = data?.some((item) => item.kernel === "aqua")
	const { checkWithToast } = usePermissionCheck()

	const setBacktestExecTime = useSetAtom(backtestExecTimeAtom)
	const [open, setOpen] = useState(false)

	const { execFuelWithEnv, getStoreValue, createTerminalWindow } =
		window.electronAPI
	const { refresh } = useBacktestResult()
	const libraryType = useAtomValue(libraryTypeAtom)
	const [_, setSelectModuleTimes] = useState<string[]>([])

	const { mutateAsync: backtest, isPending: loading } = useMutation({
		mutationKey: ["back-test"],
		mutationFn: async () => {
			setBacktestExecTime({
				startTime: dayjs().format("MM-DD HH:mm:ss"),
				endTime: dayjs().format("MM-DD HH:mm:ss"),
			})
			const kernel = libraryType === "pos" ? "zeus" : "aqua"
			console.log("开始回测", libraryType, kernel)
			await execFuelWithEnv(["select"], "策略回测", kernel)
			setBacktestExecTime(
				(prev: {
					startTime: string
					endTime: string
				}) => ({
					...prev,
					endTime: dayjs().format("MM-DD HH:mm:ss"),
				}),
			)
		},
		onSuccess: async () => {
			setOpen(false)
			toast.success("回测完成")
			await refresh()
		},
	})

	const [testTime] = useAtom(backtestExecTimeAtom)
	// const [csvFileName, setCsvFileName] = useAtom(csvFileNameAtom)

	const spendTime =
		testTime.startTime &&
		testTime.endTime &&
		testTime.startTime !== "--:--:--" &&
		testTime.endTime !== "--:--:--"
			? dayjs(testTime.endTime, "MM-DD HH:mm:ss").diff(
					dayjs(testTime.startTime, "MM-DD HH:mm:ss"),
					"second",
				)
			: "--:--:--"

	// 将秒数转换为时分秒格式
	const formatTime = (seconds: number | string) => {
		if (typeof seconds === "string") return seconds
		const h = Math.floor(seconds / 3600)
		const m = Math.floor((seconds % 3600) / 60)
		const s = seconds % 60
		return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
	}

	const { isAutoRocket } = useToggleAutoRealTrading()

	// biome-ignore lint/correctness/useExhaustiveDependencies:
	useEffect(() => {
		getStoreValue("schedule.selectModule", []).then((selectModuleTimes) => {
			setSelectModuleTimes(selectModuleTimes as string[])
		})
	}, [setSelectModuleTimes])

	return (
		<div className="w-full flex items-center gap-3">
			{isAutoRocket && (
				<TradeCtrlBtn
					size="sm"
					className="h-8 lg:flex"
					onClick={(e) => {
						e.stopPropagation()
						// -- 权限检查
						if (
							!checkWithToast({
								requireMember: true,
								windowsOnly: true,
							}).isValid
						) {
							return
						}
						setOpen(true)
					}}
				/>
			)}
			<Button
				size="sm"
				disabled={isRunning || loading || isAutoRocket}
				onClick={async (e) => {
					e.stopPropagation()
					// -- 权限检查
					if (
						!checkWithToast({
							requireMember: true,
							windowsOnly: true,
						}).isValid
					) {
						return
					}
					setOpen(true)
				}}
			>
				<PlayIcon className="w-4 h-4 mr-2 text-success-400" />
				开始回测
			</Button>
			<Separator orientation="vertical" className="h-6 border" />
			{isRunning && !isAutoRocket ? (
				<div className="inline-flex items-center gap-1 ml-2 text-success">
					<LoaderPinwheel className="size-4 animate-spin" />
					<span className="text-sm">选股内核还在运行中</span>
				</div>
			) : (
				<div className="flex items-center space-x-1">
					<div className="text-sm">最近回测时间:</div>
					<Badge variant="outline">{testTime.startTime}</Badge>
					<div className="text-sm">耗时:</div>
					<Badge variant="outline">{formatTime(spendTime)}</Badge>
					{/* <Button
						size="sm"
						variant="ghost"
						onClick={async () => {
							// const res = await refresh()
							await refresh()
	
							// if (res.status === "success") {
							// 	toast.dismiss()
							// 	toast.success("加载成功")
							// }
						}}
					>
						<ReloadIcon className="w-4 h-4 mr-2" />
						重新加载结果
					</Button> */}
				</div>
			)}

			<Dialog
				open={open}
				onOpenChange={(value) => {
					if (loading) {
						return
					}
					setOpen(value)
				}}
			>
				<DialogContent
					onKeyDown={(e) => e.preventDefault()}
					className="max-w-lg p-4"
				>
					<DialogHeader>
						<DialogTitle>💡 回测提示</DialogTitle>
					</DialogHeader>

					{loading ? (
						<div className="space-y-2">
							<p>策略回测中，请耐心等待回测完成，不要在客户端上做其他操作。</p>
							<p>
								可以在日志窗口中查看回测进展。(快捷键: <kbd>Ctrl+`</kbd>)
							</p>
						</div>
					) : (
						<>
							<div className="space-y-3 list-inside mb-2">
								<p>📈 回测可以看到配置策略的历史表现</p>
								<p>🎯 同时也会生成最新的选股结果和目标仓位</p>
								<p>⏱ 回测过程可以帮助预估实盘运行一次所需时间</p>
								<p>
									🚨
									为了不影响实盘，建议在非实盘时间段或未启动实盘情况下进行回测
								</p>
								<p>🖐 回测策略可能花费较长时间，并在此期间不能操作客户端</p>
							</div>

							<DialogFooter className="flex items-center gap-2">
								<Button variant="outline" onClick={() => setOpen(false)}>
									取消回测
								</Button>
								<Button
									onClick={async (e) => {
										e.preventDefault()
										await createTerminalWindow()
										await backtest()
									}}
								>
									<PlayIcon className="w-4 h-4 mr-2 text-success-400" />
									开始回测
								</Button>
							</DialogFooter>
						</>
					)}
				</DialogContent>
			</Dialog>
		</div>
	)
}
