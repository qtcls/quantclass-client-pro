/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { MultiStepLoader } from "@/renderer/components/ui/multi-step-loader"
import { useLoadingStates } from "@/renderer/components/ui/use-loading-states"
import { useAlertDialog } from "@/renderer/context/alert-dialog"
import { useHandleTimeTask } from "@/renderer/hooks/useHandleTimeTask"
import { useToggleAutoRealTrading } from "@/renderer/hooks/useToggleAutoRealTrading"

import { useDataSubscribed } from "@/renderer/hooks/useDataSubscribed"
import { useSettings } from "@/renderer/hooks/useSettings"
import { IDataListType } from "@/renderer/schemas/data-schema"
import { isUpdatingAtom, stepAtom, stepLoaderMapAtom } from "@/renderer/store"
import { Button } from "@renderer/components/ui/button"
import { useMutation } from "@tanstack/react-query"
import { Row } from "@tanstack/react-table"
import { useAtom, useAtomValue } from "jotai"
import {
	AlertCircle,
	Box,
	DownloadCloud,
	FileSliders,
	ListPlus,
	RefreshCcwDot,
	Trash2,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import ButtonTooltip from "./button-tooltip"

const {
	handleExecDownloadZip,
	handleUpdateOneProduct,
	handleUpdateFullProducts,
	openUrl,
	createTerminalWindow,
	fetchFuelStatus,
	loadProductStatus,
	minimizeApp,
	onDownloadProgress,
	removeDownloadProgressListener,
} = window.electronAPI

interface DataTableRowActionsProps<TData> {
	row: Row<TData>
	refresh: () => Promise<IDataListType[]>
}

const { VITE_BASE_URL } = import.meta.env

interface FetchFullDataParams {
	name: string
	fullData: string
}

export function DataTableRowActions<TData>({
	row,
	refresh,
}: DataTableRowActionsProps<TData>) {
	const task = row.original as IDataListType
	const [step, setStep] = useAtom(stepAtom)
	const [stepLoaderMap, setStepLoaderMap] = useAtom(stepLoaderMapAtom)
	const isUpdating = useAtomValue(isUpdatingAtom)
	const showStepLoader = stepLoaderMap[task.name] ?? false
	const handleTimeTask = useHandleTimeTask()
	const { isAutoRocket, handleToggleAutoRocket } = useToggleAutoRealTrading()
	const { open: openAlert } = useAlertDialog()
	const { settings, updateSettings } = useSettings()
	const { removeDataSubscribed } = useDataSubscribed()
	const [downloadProgress, setDownloadProgress] = useState("")

	// -- 获取下载链接
	const { mutateAsync: fetchFullDataLink, isPending: stepOneLoading } =
		useMutation({
			mutationKey: ["fetch-full-data-link"],
			mutationFn: async (params: FetchFullDataParams) => {
				return await handleUpdateFullProducts(params.name, params.fullData)
			},
		})

	// -- 下载全量数据
	const { mutateAsync: execDownloadZip, isPending: stepTwoLoading } =
		useMutation({
			mutationKey: ["exec-download-zip"],
			mutationFn: async (product_name: string) =>
				await handleExecDownloadZip(product_name),
		})

	// -- 导入全量数据
	const { mutateAsync: updateFullDataAsync, isPending: stepThreeLoading } =
		useMutation({
			mutationKey: ["update-full-products"],
			mutationFn: async (name: string) => {
				return await handleUpdateFullProducts(name)
			},
		})

	// -- 增量更新
	const { mutateAsync: updateOneProduct } = useMutation({
		mutationKey: ["update-one-product"],
		mutationFn: async (product_name: string) =>
			await handleUpdateOneProduct(product_name),
		onSuccess: (data) => {
			data?.status === "success" && toast.success("增量更新成功")
		},
	})

	const loadingStates = useLoadingStates(
		task,
		{ stepOneLoading, stepTwoLoading, stepThreeLoading },
		updateFullDataAsync,
		refresh,
	)

	// 设置下载进度监听器的函数
	const setupDownloadProgressListener = () => {
		removeDownloadProgressListener() // 先移除旧的，避免重复
		setDownloadProgress("")

		onDownloadProgress((progress) => {
			// 只处理当前任务产品的下载进度
			if (progress.product_name !== task.name) {
				return
			}

			const { percent, transferred, total, bytesPerSecond } = progress
			const formattedSpeed =
				percent >= 100
					? "已完成"
					: bytesPerSecond > 0
						? `${(bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s`
						: "计算中..."
			const formattedTransferred = `${(transferred / 1024 / 1024).toFixed(
				2,
			)} MB`
			const formattedTotal =
				total > 0 ? `${(total / 1024 / 1024).toFixed(2)} MB` : "未知大小"
			const msg = `[下载进度] ${progress.product_name}: ${percent.toFixed(2)}% (${formattedTransferred} / ${formattedTotal}) - ${formattedSpeed}`
			setDownloadProgress(msg)
			console.log(msg)
			console.log(stepOneLoading, stepTwoLoading, stepThreeLoading)

			// 下载完成后清除进度显示并移除监听器
			if (percent >= 100) {
				setTimeout(() => {
					removeDownloadProgressListener()
				}, 2000)
			}
		})
	}

	return (
		<div className="flex items-center gap-2" key={task.name}>
			<ButtonTooltip content="增量更新" delayDuration={0}>
				<Button
					variant="outline"
					className="flex h-7 w-7 p-0 text-success hover:text-success hover:border-success"
					disabled={task.canAutoUpdate !== 1 || isUpdating}
					onClick={() => {
						openAlert({
							title: `检查并更新数据`,
							description: task.displayName ?? task.name,
							content: (
								<div className="leading-relaxed space-y-3">
									<div className="flex items-center gap-2">
										<RefreshCcwDot size={20} className="min-w-8" />
										客户端根据本地
										<span className="font-semibold">数据时间</span>
										，自动判断是否需要更新。
									</div>
									<div className="flex items-center gap-2">
										<DownloadCloud size={20} className="min-w-8" />
										会自动查询缺失日期，并逐日下载增量包。
									</div>
									<div className="flex items-center gap-2">
										<Box size={20} className="min-w-8" />
										增量数据下载后，会自动解压并合并到本地历史数据。
									</div>
									<hr />
									<div className="text-sm text-warning-600 dark:text-warning-400 leading-relaxed">
										<span className="font-bold">⚠️ 注意：</span>
										<ul className="list-disc pl-4 mt-1">
											<li>
												数据更新时间与当前数据大小、当前的网速以及处理器性能有关。
											</li>
											<li>
												如缺失天数比较多，则需要等待较长时间，
												<span className="font-bold">建议直接全量恢复数据</span>
												。
											</li>
										</ul>
									</div>
								</div>
							),
							okText: "确认增量更新",
							onOk: async () => {
								const fuelStatus = await fetchFuelStatus()
								if (fuelStatus) {
									toast.info("正在自动更新，请稍候...")
									return
								}

								const needResume = isUpdating

								await createTerminalWindow()
								if (needResume) {
									await handleTimeTask(true)
								}
								await updateOneProduct(task.name)
								await refresh()
								if (needResume) {
									await handleTimeTask(false)
								}
								await minimizeApp("terminal")
							},
						})
					}}
				>
					<ListPlus size={14} />
				</Button>
			</ButtonTooltip>
			<ButtonTooltip content="全量恢复数据" delayDuration={0}>
				<Button
					variant="outline"
					className="flex h-7 w-7 p-0"
					disabled={isUpdating}
					onClick={() => {
						openAlert({
							title: `全量恢复数据`,
							description: task.displayName ?? task.name,
							content: (
								<div className="leading-relaxed space-y-3">
									<div className="flex items-center gap-2">
										<DownloadCloud size={20} className="min-w-8" />
										客户端自动从服务器下载最新全量数据，并解压缩。
									</div>
									<div className="flex items-center gap-2">
										<FileSliders size={20} className="min-w-8" />
										恢复过程会覆盖本地数据，可基本解决所有数据问题。
									</div>
									<div className="flex items-center gap-2">
										<AlertCircle size={20} className="min-w-8" />
										如果恢复失败，3小时内重复操作，不消耗次数。
									</div>
									<hr />
									<div className="text-sm text-warning-600 dark:text-warning-400 leading-relaxed">
										<span className="font-bold">⚠️ 注意：</span>
										<ul className="list-disc pl-4 mt-1">
											<li>
												恢复数据的时间和当前全量数据大小、当前的网速以及处理器性能有关。
											</li>
											<li>普通数据在正常宽带下，需要1-3分钟。</li>
											<li>
												如果恢复的数据比较大，比如日线全息数据，需要等到5min左右。
											</li>
										</ul>
									</div>
								</div>
							),
							okText: "确认恢复数据",
							onOk: async () => {
								// 设置当前任务的 loader 显示状态为 true
								setStepLoaderMap((prev) => ({ ...prev, [task.name]: true }))

								// 等待一个微任务，确保状态更新生效
								await new Promise((resolve) => setTimeout(resolve, 0))

								try {
									// -- 如果正在自动更新，先暂停
									const needResume = isUpdating
									const needResumeRealTrading = isAutoRocket
									if (needResume) {
										await handleTimeTask(true)
									}

									setStep(0)

									await fetchFullDataLink({
										name: task.name,
										fullData: task.fullData,
									})
									const r = await loadProductStatus()

									const currentTimestamp = Date.now() / 1000
									const expirationTimestamp =
										r?.[task.name]?.fullDataDownloadExpires ?? 0

									if (
										!expirationTimestamp ||
										currentTimestamp > expirationTimestamp
									) {
										toast.error("下载链接已过期，请到网站续费该数据次数", {
											action: {
												label: "打开网站",
												onClick: () => {
													if (task.fullData !== undefined) {
														openUrl(
															`${VITE_BASE_URL}/api/product/data-route/${task.fullData}`,
														)

														return
													}
													let url = `${VITE_BASE_URL}/api/product/data-route/${task.name}`

													if (url.endsWith("-daily")) {
														url = url.replace("-daily", "")
													}

													openUrl(url)
												},
											},
										})
										return
									} else {
										setStep(1)
									}

									// 在下载前设置进度监听器
									setupDownloadProgressListener()
									try {
										await execDownloadZip(task.name)
									} finally {
										// 下载完成后清理监听器（延迟清理以确保最后的进度回调完成）
										setTimeout(() => {
											removeDownloadProgressListener()
										}, 3000)
									}
									setStep(2)

									const res = await updateFullDataAsync(task.name)

									if (res.status === "success") {
										setStep((p) => p + 1)
										toast.success("全量更新成功")
										setStep(0)
										await refresh()
									}

									// -- 如果之前在自动更新，恢复自动更新
									if (needResume) {
										await handleTimeTask(false)
									}

									if (needResumeRealTrading) {
										await handleToggleAutoRocket(true)
									}
								} catch (e) {
									toast.error("全量更新失败，请提交日志给助教了解详细信息")
								} finally {
									// 无论成功还是失败，都关闭 loader
									setStepLoaderMap((prev) => {
										const next = { ...prev }
										delete next[task.name]
										return next
									})
								}
							},
						})
					}}
				>
					<RefreshCcwDot size={14} />
				</Button>
			</ButtonTooltip>
			<ButtonTooltip content="取消订阅" delayDuration={0}>
				<Button
					variant="outline"
					className="flex h-7 w-7 p-0 text-destructive hover:text-destructive hover:border-destructive"
					disabled={isUpdating}
					onClick={() => {
						openAlert({
							title: "确认取消订阅？",
							content: (
								<div className="leading-relaxed">
									<span>
										{`将取消订阅「${task.displayName ?? task.name}」的数据。`}
									</span>
									<br />
									<span className="text-destructive font-semibold">
										⚠️ 此操作不可撤销。
									</span>
								</div>
							),
							okText: "确认取消",
							onOk: async () => {
								try {
									updateSettings({
										data_white_list: settings.data_white_list.filter(
											(key) => key !== task.name,
										),
									})
									removeDataSubscribed(task)
									toast.success("已取消订阅")
									await refresh()
								} catch (e) {
									toast.error("取消订阅失败")
								}
							},
						})
					}}
				>
					<Trash2 size={14} />
				</Button>
			</ButtonTooltip>
			<MultiStepLoader
				task={task}
				loadingStates={loadingStates}
				currentState={step}
				setCurrentState={setStep}
				showStepLoader={showStepLoader}
				downloadProgress={downloadProgress}
			/>
		</div>
	)
}
