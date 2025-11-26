/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { PerformanceModeSelectTabs } from "@/renderer/components/select-tabs"
import { Badge } from "@/renderer/components/ui/badge"
import { Button } from "@/renderer/components/ui/button"
import ButtonTooltip from "@/renderer/components/ui/button-tooltip"
// import { Card, CardContent, CardFooter } from "@/renderer/components/ui/card"
import DatePicker from "@/renderer/components/ui/date-picker"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/renderer/components/ui/form"
import { Input } from "@/renderer/components/ui/input"
import {
	RadioGroup,
	RadioGroupItem,
} from "@/renderer/components/ui/radio-group"
// import { ScrollArea } from "@/renderer/components/ui/scroll-area"
import { usePermissionCheck, useToggleAutoRealTrading } from "@/renderer/hooks"
import { useRealMarketConfig } from "@/renderer/hooks/useRealMarketConfig"
import { realConfigEditModalAtom } from "@/renderer/store"
import { rocketStatusQueryAtom } from "@/renderer/store/query"
import { realMarketConfigSchemaAtom } from "@/renderer/store/storage"
import { userAtom } from "@/renderer/store/user"
import { zodResolver } from "@hookform/resolvers/zod"
import dayjs from "dayjs"
import { useDebounceFn } from "etc-hooks"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { CircleHelp, Folder, PlayCircle, Save } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

const { setStoreValue, rendererLog, openUrl } = window.electronAPI

export const RealMarketConfigSchema = z.object({
	qmt_path: z.string().min(1, { message: "QMT 安装路径未填写" }),
	account_id: z.string().min(1, { message: "账户号未填写" }),
	qmt_port: z.string().min(1, { message: "QMT 端口号未填写" }),
	date_start: z.date().optional(),
	message_robot_url: z.string().optional(),
	filter_kcb: z.enum(["0", "1"]),
	filter_cyb: z.enum(["0", "1"]),
	filter_bj: z.enum(["0", "1"]),
	// -- 均衡-EQUAL，性能-PERFORMANCE，节能-ECONOMY
	performance_mode: z.enum(["EQUAL", "PERFORMANCE", "ECONOMY"]),
	reverse_repo_keep: z.union([z.string(), z.number()]).refine(
		(value) => {
			const numValue =
				typeof value === "string" ? Number.parseFloat(value) : value
			return !Number.isNaN(numValue) && numValue >= 0
		},
		{ message: "逆回购保留金额必须是一个大于等于0的数字" },
	),
})

type FormData = z.infer<typeof RealMarketConfigSchema>

export function TradingConfigForm() {
	const { selectDirectory, createRealTradingDir } = window.electronAPI
	const { user } = useAtomValue(userAtom)
	const { data: rocketStatus = false } = useAtomValue(rocketStatusQueryAtom)
	const { checkWithToast } = usePermissionCheck()
	const [choosing, setChoosing] = useState(false)
	const [realMarketConfig, setRealMarketConfig] = useAtom(
		realMarketConfigSchemaAtom,
	)

	const { setPerformanceMode } = useRealMarketConfig()

	const setRealConfigEditModal = useSetAtom(realConfigEditModalAtom)
	const { isAutoRocket, handleToggleAutoRocket } = useToggleAutoRealTrading()

	const defaultValues = useMemo(() => {
		return {
			...realMarketConfig,
			date_start:
				typeof realMarketConfig.date_start === "string"
					? new Date(realMarketConfig.date_start)
					: realMarketConfig.date_start,
			qmt_port: "58610",
			filter_kcb: realMarketConfig.filter_kcb,
			filter_cyb: realMarketConfig.filter_cyb,
			filter_bj: realMarketConfig.filter_bj,
			performance_mode: realMarketConfig.performance_mode ?? "EQUAL",
			reverse_repo_keep: realMarketConfig.reverse_repo_keep ?? 1000,
		}
	}, [realMarketConfig])

	const form = useForm<FormData>({
		mode: "onChange",
		resolver: zodResolver(RealMarketConfigSchema),
		defaultValues,
	})

	const handleSave = async () => {
		try {
			// -- 权限检查
			if (
				!checkWithToast({
					requireMember: true,
					windowsOnly: true,
					onlyIn2025: true,
				}).isValid
			) {
				return
			}
			if (rocketStatus) {
				toast.dismiss()
				toast.warning("实盘中，请暂停实盘，再进行配置")
				return
			}

			const isValid = await form.trigger()
			if (!isValid) {
				toast.error("表单数据不合法")
				await rendererLog(
					"error",
					`实盘配置表单数据不合法: ${JSON.stringify(form.formState.errors)}`,
				)
				return
			}

			await createRealTradingDir()

			const values = form.getValues()

			// -- 处理 start_date，确保保存的是字符串
			const { date_start, ...restValues } = values
			const formattedValues = {
				...restValues,
				filter_kcb: values.filter_kcb !== "0",
				filter_cyb: values.filter_cyb !== "0",
				filter_bj: values.filter_bj !== "0",
				date_start: date_start
					? dayjs(date_start).format("YYYY-MM-DD")
					: undefined,
			}

			// -- 这里应该调用 setStoreValue 来保存配置
			setPerformanceMode(values.performance_mode)
			await setStoreValue("real_market_config", formattedValues)
			setRealMarketConfig(values)

			toast.success("实盘配置保存成功")
			return true
		} catch (error) {
			toast.error("实盘配置保存失败")
			return false
		}
	}

	const handleFolderSelect = useDebounceFn(
		async (key: keyof z.infer<typeof RealMarketConfigSchema>) => {
			if (choosing) return

			setChoosing(true)
			try {
				const res = (await selectDirectory()) as string

				if (res) {
					form.setValue(key, res, { shouldValidate: true })
				}
			} finally {
				setChoosing(false)
			}
		},
		{ wait: 100 },
	)

	// biome-ignore lint/correctness/useExhaustiveDependencies:
	useEffect(() => {
		form.reset(defaultValues)
	}, [])

	return (
		// <Card className="flex-1 overflow-hidden border bg-transparent shadow-none">
		// 	<CardContent className="p-0">
		// 		<ScrollArea className="h-full">
		<>
			<Form {...form}>
				<form className="w-full space-y-4 flex flex-col gap-4">
					<div className="grid grid-cols-4 gap-x-4">
						<div className="flex items-center space-x-2">
							<FormField
								name="filter_kcb"
								control={form.control}
								render={({ field }) => (
									<FormItem className="flex flex-col gap-2 items-start">
										<FormLabel className="!mt-0 flex items-center gap-1 mr-1">
											<span className="font-semibold">过滤科创板</span>{" "}
											<span className="text-destructive">*</span>
											<ButtonTooltip
												content={
													<div>
														<p>
															选择“过滤”，系统会禁止所有策略选择对应板块的股票
														</p>
														<p>
															选择“不过滤”，所有策略都不会过滤，如果需要针对单个策略做过滤，请参考帖子：
															<span
																onKeyDown={(e) => {
																	if (e.key === "Enter" || e.key === " ") {
																		e.preventDefault()
																	}
																}}
																onClick={() =>
																	openUrl("https://qtcls.cn/38022")
																}
																className="underline cursor-pointer hover:no-underline"
															>
																qtcls.cn/38022
															</span>
														</p>
													</div>
												}
											>
												<CircleHelp
													className="h-4 w-4 text-muted-foreground hover:cursor-pointer"
													onClick={(e) => e.stopPropagation()}
												/>
											</ButtonTooltip>
										</FormLabel>

										<FormControl>
											<RadioGroup
												disabled={!user?.isMember}
												onValueChange={field.onChange}
												defaultValue={field.value}
												className="flex space-x-1"
											>
												<FormItem className="flex items-center space-x-1 space-y-0">
													<FormControl>
														<RadioGroupItem value="0" />
													</FormControl>
													<FormLabel
														className={`${field.value === "0" ? "font-bold" : "font-normal"}`}
													>
														不过滤
													</FormLabel>
												</FormItem>
												<FormItem className="flex items-center space-x-1 space-y-0">
													<FormControl>
														<RadioGroupItem value="1" />
													</FormControl>
													<FormLabel
														className={`${field.value === "1" ? "font-bold" : "font-normal"}`}
													>
														过滤
													</FormLabel>
												</FormItem>
											</RadioGroup>
										</FormControl>
									</FormItem>
								)}
							/>
						</div>

						<div className="flex items-center space-x-2">
							<FormField
								name="filter_cyb"
								control={form.control}
								render={({ field }) => (
									<FormItem className="flex flex-col gap-2 items-start">
										<FormLabel className="!mt-0 flex items-center gap-1">
											<span className="font-semibold">过滤创业板</span>
											<span className="text-destructive">*</span>
											<ButtonTooltip
												content={
													<div>
														<p>
															选择“过滤”，系统会禁止所有策略选择对应板块的股票
														</p>
														<p>
															选择“不过滤”，所有策略都不会过滤，如果需要针对单个策略做过滤，请参考帖子：
															<span
																onKeyDown={(e) => {
																	if (e.key === "Enter" || e.key === " ") {
																		e.preventDefault()
																	}
																}}
																onClick={() =>
																	openUrl("https://qtcls.cn/38022")
																}
																className="underline cursor-pointer hover:no-underline"
															>
																qtcls.cn/38022
															</span>
														</p>
													</div>
												}
											>
												<CircleHelp
													className="h-4 w-4 text-muted-foreground hover:cursor-pointer"
													onClick={(e) => e.stopPropagation()}
												/>
											</ButtonTooltip>
										</FormLabel>

										<FormControl>
											<RadioGroup
												disabled={!user?.isMember}
												onValueChange={field.onChange}
												defaultValue={field.value}
												className="flex space-x-1"
											>
												<FormItem className="flex items-center space-x-1 space-y-0">
													<FormControl>
														<RadioGroupItem value="0" />
													</FormControl>
													<FormLabel
														className={`${field.value === "0" ? "font-bold" : "font-normal"}`}
													>
														不过滤
													</FormLabel>
												</FormItem>
												<FormItem className="flex items-center space-x-1 space-y-0">
													<FormControl>
														<RadioGroupItem value="1" />
													</FormControl>
													<FormLabel
														className={`${field.value === "1" ? "font-bold" : "font-normal"}`}
													>
														过滤
													</FormLabel>
												</FormItem>
											</RadioGroup>
										</FormControl>
									</FormItem>
								)}
							/>
						</div>

						<div className="flex items-center space-x-2">
							<FormField
								name="filter_bj"
								control={form.control}
								render={({ field }) => (
									<FormItem className="flex flex-col gap-2 items-start">
										<FormLabel className="!mt-0 flex items-center gap-1 mr-1">
											<span className="font-semibold">过滤北交所</span>{" "}
											<span className="text-destructive">*</span>
										</FormLabel>

										<FormControl>
											<RadioGroup
												disabled={!user?.isMember}
												onValueChange={field.onChange}
												defaultValue={field.value}
												className="flex space-x-1"
											>
												<FormItem className="flex items-center space-x-1 space-y-0">
													<FormControl>
														<RadioGroupItem value="0" />
													</FormControl>
													<FormLabel
														className={`${field.value === "0" ? "font-bold" : "font-normal"}`}
													>
														不过滤
													</FormLabel>
												</FormItem>
												<FormItem className="flex items-center space-x-1 space-y-0">
													<FormControl>
														<RadioGroupItem value="1" />
													</FormControl>
													<FormLabel
														className={`${field.value === "1" ? "font-bold" : "font-normal"}`}
													>
														过滤
													</FormLabel>
												</FormItem>
											</RadioGroup>
										</FormControl>
									</FormItem>
								)}
							/>
						</div>

						<div className="flex items-center space-x-2">
							<FormField
								name="performance_mode"
								control={form.control}
								render={({ field }) => (
									<FormItem className="flex flex-col gap-2 items-start">
										<FormLabel className="!mt-0 flex items-center gap-1 mr-1">
											<span className="font-semibold">性能模式</span>{" "}
											<span className="text-destructive">*</span>
											<ButtonTooltip
												content={
													<div>
														<p>选择“节能”，实盘使用 1/3 系统核心数进行计算</p>
														<p>选择“均衡”，实盘使用 1/2 系统核心数进行计算</p>
														<p>选择“性能”，实盘使用 系统核心数 - 1 进行计算</p>
													</div>
												}
											>
												<CircleHelp
													className="h-4 w-4 text-muted-foreground hover:cursor-pointer"
													onClick={(e) => e.stopPropagation()}
												/>
											</ButtonTooltip>
										</FormLabel>

										<FormControl>
											<PerformanceModeSelectTabs
												name="性能模式"
												defaultValue={field.value}
												onValueChange={field.onChange}
												showToast={false}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4 gap-y-6">
						<FormField
							name="qmt_path"
							control={form.control}
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										QMT 安装路径
										<span className="text-destructive mx-1">*</span>
										<Badge className="font-semibold">
											{"<QMT 路径>/userdata_mini"}
										</Badge>
									</FormLabel>
									<div className="flex w-full gap-2">
										<FormControl className="flex-grow">
											<Input
												{...field}
												readOnly
												disabled={!user?.isMember}
												onClick={() => handleFolderSelect.run("qmt_path")}
												placeholder="请填写 qmt 安装路径..."
											/>
										</FormControl>
										<Button
											size="sm"
											variant="outline"
											disabled={!user?.isMember}
											onClick={(e) => {
												e.preventDefault()
												handleFolderSelect.run("qmt_path")
											}}
										>
											<Folder className="mr-2 h-4 w-4" />
											<span>选择文件夹</span>
										</Button>
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							name="account_id"
							control={form.control}
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										QMT 账户号 <span className="text-destructive">*</span>{" "}
										<span className="text-xs text-muted-foreground">
											QMT账号，不清楚可以询问客户经理
										</span>
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											disabled={!user?.isMember}
											className="w-full"
											placeholder="请填写 qmt 账户号..."
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							name="qmt_port"
							control={form.control}
							render={({ field }) => (
								<FormItem className="hidden">
									<FormLabel>
										QMT 端口号 <span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											disabled
											className="w-full"
											placeholder="请填写 qmt 端口号..."
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							name="date_start"
							control={form.control}
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										计算起始日期 <span className="text-destructive">*</span>
										<span className="text-xs text-muted-foreground">
											运行选股的起始日期，一般参数越大需要越久的日期
										</span>
									</FormLabel>

									<FormControl>
										<DatePicker {...field} disableFutureDates />
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							name="message_robot_url"
							control={form.control}
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										消息机器人 URL{" "}
										<span className="text-xs text-muted-foreground">
											机器人配置参考：
										</span>
										<span
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault()
												}
											}}
											onClick={() =>
												openUrl("https://bbs.quantclass.cn/thread/10975")
											}
											className="underline cursor-pointer hover:no-underline text-xs"
										>
											quantclass/10975
										</span>
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											className="w-full"
											placeholder="可以不填..."
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							name="reverse_repo_keep"
							control={form.control}
							render={({ field, formState }) => (
								<FormItem>
									<FormLabel className="!mt-0 flex items-center gap-1 mr-1">
										<span className="font-semibold">逆回购保留金额</span>{" "}
										<span className="text-xs text-muted-foreground">
											如果未了解请不要修改
										</span>{" "}
										<ButtonTooltip
											content={
												<div>
													<p>
														每天尾盘自动买入1天期的逆回购，如果不想全部的钱都买逆回购，可以在这里设置需要保留的金额
													</p>
												</div>
											}
										>
											<CircleHelp
												className="h-4 w-4 text-muted-foreground hover:cursor-pointer"
												onClick={(e) => e.stopPropagation()}
											/>
										</ButtonTooltip>
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											{...field}
											value={field.value || ""} // 确保输入框始终有值
											min={0}
											placeholder="请填写保留金额"
										/>
									</FormControl>
									<FormMessage>
										{formState.errors.reverse_repo_keep?.message}
									</FormMessage>
								</FormItem>
							)}
						/>
					</div>
				</form>
			</Form>
			<hr />
			<div className="flex justify-center gap-2">
				<Button size="sm" onClick={() => handleSave()}>
					<Save className="mr-2 size-4" />
					保存实盘配置
				</Button>
				<Button
					size="sm"
					variant="success"
					onClick={async () => {
						const isSuccess = await handleSave()
						if (!isSuccess) return
						if (await handleToggleAutoRocket(true))
							// 如果成功启动
							setRealConfigEditModal(false)
					}}
					disabled={isAutoRocket}
				>
					<PlayCircle className="mr-2 size-4" />
					{isAutoRocket ? "正在实盘自动更新" : "保存配置并启动"}
				</Button>
			</div>
		</>
		// 		</ScrollArea>
		// 	</CardContent>

		// 	<CardFooter className="flex justify-end gap-2 p-4 pt-0">
		// 		<Button size="sm" onClick={() => handleSave()}>
		// 			保存实盘配置
		// 		</Button>
		// 	</CardFooter>
		// </Card>
	)
}
