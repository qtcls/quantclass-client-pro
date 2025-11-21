/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import LoadingAnime from "@/renderer/components/LoadingAnime"
import { MultiStepLoader } from "@/renderer/components/ui/multi-step-loader"
import { useLoadingStates } from "@/renderer/components/ui/use-loading-states"
import { useAlertDialog } from "@/renderer/context/alert-dialog"
import { useHandleTimeTask } from "@/renderer/hooks/useHandleTimeTask"
import { useToggleAutoRealTrading } from "@/renderer/hooks/useToggleAutoRealTrading"

import { useDataSubscribed } from "@/renderer/hooks/useDataSubscribed"
import { useSettings } from "@/renderer/hooks/useSettings"
import { IDataListType } from "@/renderer/schemas/data-schema"
import { isUpdatingAtom, stepAtom } from "@/renderer/store"
import { Button } from "@renderer/components/ui/button"
import { useMutation } from "@tanstack/react-query"
import { Row } from "@tanstack/react-table"
import { useAtom, useAtomValue } from "jotai"
import {
	DownloadCloud,
	FileSliders,
	ListPlus,
	AlertCircle,
	Trash2,
	Box,
	RefreshCcwDot,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import ButtonTooltip from "./button-tooltip"

const {
	execFuelWithEnv,
	handleExecDownloadZip,
	handleUpdateOneProduct,
	handleUpdateFullProducts,
	openUrl,
	createTerminalWindow,
	fetchFuelStatus,
	loadProductStatus,
	minimizeApp,
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
	const [l, setL] = useState(false)
	const [step, setStep] = useAtom(stepAtom)
	const isUpdating = useAtomValue(isUpdatingAtom)
	const handleTimeTask = useHandleTimeTask()
	const { isAutoRocket, handleToggleAutoRocket } = useToggleAutoRealTrading()
	const { open: openAlert } = useAlertDialog()
	const { settings, updateSettings } = useSettings()
	const { removeDataSubscribed } = useDataSubscribed()

	// -- Mutations Start
	const { mutateAsync: updateFullDataAsync, isPending: stepThreeLoading } =
		useMutation({
			mutationKey: ["update-full-products"],
			mutationFn: async (name: string) => {
				return await handleUpdateFullProducts(name)
			},
		})

	const { mutateAsync: fetchFullDataLink, isPending: stepOneLoading } =
		useMutation({
			mutationKey: ["fetch-full-data-link"],
			mutationFn: async (params: FetchFullDataParams) => {
				return await handleUpdateFullProducts(params.name, params.fullData)
			},
		})

	const { mutateAsync: execDownloadZip, isPending: stepTwoLoading } =
		useMutation({
			mutationKey: ["exec-download-zip"],
			mutationFn: async (product_name: string) =>
				await handleExecDownloadZip(product_name),
		})

	const { mutateAsync: preprocessData, isPending: preprocessDataLoading } =
		useMutation({
			mutationKey: ["preprocess-data"],
			mutationFn: async () =>
				await execFuelWithEnv(
					["preprocess_data"],
					"生成预处理数据",
					"fuel",
					"preprocess_data",
				),
		})

	const { mutateAsync: updateOneProduct, isPending: loading } = useMutation({
		mutationKey: ["update-one-product"],
		mutationFn: async (product_name: string) =>
			await handleUpdateOneProduct(product_name),
		onSuccess: (data) => {
			data?.status === "success" && toast.success("增量更新成功")
		},
	})
	// -- Mutations End

	const loadingStates = useLoadingStates(
		task,
		{ stepOneLoading, stepTwoLoading, stepThreeLoading },
		setL,
		updateFullDataAsync,
		refresh,
	)

	const isLoading = useMemo(
		() =>
			loading || stepOneLoading || stepThreeLoading || preprocessDataLoading,
		[loading, stepOneLoading, stepThreeLoading, preprocessDataLoading],
	)

	return (
		<>
			<LoadingAnime loading={isLoading} />

			<div className="flex items-center gap-2">
				<ButtonTooltip content="增量更新" delayDuration={0}>
					<Button
						variant="outline"
						className="flex h-7 w-7 p-0 text-success hover:text-success hover:border-success"
						disabled={
							task.canAutoUpdate !== 1 ||
							isUpdating ||
							task.name === "coin-binance-spot-swap-preprocess-pkl-1h"
						}
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
													<span className="font-bold">
														建议直接全量恢复数据
													</span>
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
						disabled={
							isUpdating ||
							task.name === "coin-binance-spot-swap-preprocess-pkl-1h"
						}
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
									try {
										const fuelStatus = await fetchFuelStatus()
										if (fuelStatus) {
											toast.info("已在自动更新，请稍候...")
											return
										}

										// -- 如果正在自动更新，先暂停
										const needResume = isUpdating
										const needResumeRealTrading = isAutoRocket
										if (needResume) {
											await handleTimeTask(true)
										}

										if (
											task.name === "coin-binance-spot-swap-preprocess-pkl-1h"
										) {
											await preprocessData()
											await refresh()

											// -- 如果之前在自动更新，恢复自动更新
											if (needResume) {
												await handleTimeTask(false)
											}

											if (needResumeRealTrading) {
												await handleToggleAutoRocket(true)
											}

											return
										}
										setStep(0)
										setL(true)

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
										}

										await execDownloadZip(task.name)
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
			</div>
			{/* <DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						className="flex h-8 w-8 p-0 text-muted-foreground data-[state=open]:bg-muted"
					>
						<DotsHorizontalIcon className="h-4 w-4" />
						<span className="sr-only">Open menu</span>
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent align="end" className="w-[160px]">
					<DropdownMenuItem
						// disabled={task.isAutoUpdate === 0}
						disabled={isUpdating}
						className="hover:cursor-pointer"
						onClick={async () => {
							try {
								const fuelStatus = await fetchFuelStatus()
								if (fuelStatus) {
									toast.info("已在自动更新，请稍候...")
									return
								}

								// -- 如果正在自动更新，先暂停
								const needResume = isUpdating
								const needResumeRealTrading = isAutoRocket
								if (needResume) {
									await handleTimeTask(true)
								}

								if (task.name === "coin-binance-spot-swap-preprocess-pkl-1h") {
									await preprocessData()
									await refresh()

									// -- 如果之前在自动更新，恢复自动更新
									if (needResume) {
										await handleTimeTask(false)
									}

									if (needResumeRealTrading) {
										await handleToggleAutoRocket(true)
									}

									return
								}

								await fetchFullDataLink({
									name: task.name,
									fullData: task.fullData,
								})
								const r = await loadProductStatus()

								const currentTimestamp = Date.now() / 1000
								const expirationTimestamp =
									r?.[task.name]?.fullDataDownloadExpires ?? 0

								setL(true)

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
								}

								setStep(1)

								await execDownloadZip(task.name)
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
							}
						}}
					>
						<ListRestart size={14} /> 全量更新
					</DropdownMenuItem>

					<DropdownMenuItem
						disabled={
							task.canAutoUpdate !== 1 ||
							isUpdating ||
							task.name === "coin-binance-spot-swap-preprocess-pkl-1h"
						}
						className="hover:cursor-pointer"
						onClick={async () => {
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
						}}
					>
						<ListPlus size={14} /> 增量更新
					</DropdownMenuItem>
					<DropdownMenuItem
						className="hover:cursor-pointer text-destructive focus:text-destructive"
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
						<X size={14} /> 取消订阅
					</DropdownMenuItem>

					<hr className="my-1" />
					{isUpdating && (
						<DropdownMenuItem className="hover:cursor-pointer text-xs">
							<Loader2 size={12} className="animate-spin text-success" />
							数据自动同步中
						</DropdownMenuItem>
					)}
					<DropdownMenuItem
						className="hover:cursor-pointer text-xs"
						disabled={!isUpdating}
					>
						客户端检查更新时间
						{(row.original as IDataListType)?.lastUpdateTime ?? "--:--:--"}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu> */}

			<MultiStepLoader
				task={task}
				loading={l}
				currentState={step}
				loadingStates={loadingStates}
				setCurrentState={setStep}
				stepOneLoading={stepOneLoading}
			/>

			{/* {l && (
				<Button
					variant="outline"
					className="fixed right-4 top-12 z-[120] text-black dark:text-white p-0 border-none hover:bg-transparent"
					onClick={() => {
						setL(false)
						setStep(0)
						refresh()
					}}
				>
					<X className="h-10 w-10" />
				</Button>
			)} */}
		</>
	)
}
