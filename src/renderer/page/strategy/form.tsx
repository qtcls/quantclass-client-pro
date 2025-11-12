/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import ButtonTooltip from "@/renderer/components/ui/button-tooltip"
import { Input as InputUI } from "@/renderer/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/renderer/components/ui/tabs"
import { TimePicker } from "@/renderer/components/ui/time-picker"
import { ALLOWED_HOLD_PERIODS } from "@/renderer/constant/strategy"
import { cn } from "@/renderer/lib/utils"
import ScaleinTargetsView from "@/renderer/page/strategy/ScaleinTargetsView"
import { useFormValidation } from "@/renderer/page/strategy/form-validation"
import type {
	SelectStgFormData,
	SelectStgFormProps,
} from "@/renderer/page/strategy/types"
import { SelectStgFormSchema } from "@/renderer/schemas/strategy"
import { formatTime } from "@/renderer/utils/time"
import { autoTradeTimeByRebTime } from "@/renderer/utils/trade"
import { Input } from "@heroui/input"
import { Select, SelectItem, SelectSection } from "@heroui/select"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@renderer/components/ui/button"
import { CardContent, CardFooter } from "@renderer/components/ui/card"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@renderer/components/ui/form"
import {
	AlarmClockCheck,
	Biohazard,
	CircleHelp,
	CircuitBoard,
	Filter,
	Loader,
	Shell,
	Shuffle,
	Timer,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

export function SelectStgForm({
	defaultValues,
	submitText = "保存策略",
	// name,
	onSave,
}: SelectStgFormProps) {
	const form = useForm<SelectStgFormData>({
		resolver: zodResolver(SelectStgFormSchema),
		defaultValues,
	})
	const [saving, setSaving] = useState(false)
	const [tabValue, setTabValue] = useState("进场") //进场 离场  --择时

	// 初始化 signalTime 状态
	const [signalTime, setSignalTime] = useState<string>()

	const timing = form.getValues("timing")
	const override = form.getValues("override")

	useEffect(() => {
		// 从 timing 和 override 的 factor_list 中合并所有因子分钟数据，找出最大值
		const allFactorLists: any[] = []

		if (timing?.factor_list && timing.factor_list.length > 0) {
			allFactorLists.push(...timing.factor_list)
		}

		if (override?.factor_list && override.factor_list.length > 0) {
			allFactorLists.push(...override.factor_list)
		}

		// 如果没有任何因子列表，重置为 "close"
		if (allFactorLists.length === 0) {
			setSignalTime("close")
			return
		}

		// 提取所有分钟数据（第 5 个元素）并筛选数字型
		const timeArr = allFactorLists.map((item) => item[4])
		const numericTimes = timeArr.filter(
			(item): item is string => typeof item === "string" && /^\d+$/.test(item),
		)

		// 计算全局最大值
		const maxTime =
			numericTimes.length > 0
				? numericTimes.reduce((max, current) => (current > max ? current : max))
				: "close"

		setSignalTime(maxTime)
	}, [timing, override])

	// -- 表单验证和提交逻辑
	const validateAndSubmit = async (data: SelectStgFormData) => {
		const { validateFormData } = useFormValidation(form)
		return await validateFormData(data)
	}

	const handleSubmit = async () => {
		const data = form.getValues()
		const isValid = await form.trigger()

		if (!isValid) {
			toast.error("表单数据不合法")
			console.log(form.formState.errors)

			return
		}

		if (
			!(await validateAndSubmit({
				...data,
				rebalance_time: data.rebalance_time ?? "close-open",
			}))
		)
			return

		setTimeout(() => {
			onSave({
				...form.getValues(),
				select_num: Number(form.getValues("select_num")),
				rebalance_time: form.getValues("rebalance_time") || "close-open",
				buy_time: formatTime(form.getValues("buy_time")),
				sell_time: formatTime(form.getValues("sell_time")),
				split_order_amount: Number(form.getValues("split_order_amount")),
			})
			setSaving(false)
		}, 150)
	}

	//动态计算换仓时间selectItem
	const getRebalanceOptions = () => {
		const rebalance_time = form.getValues("rebalance_time") || "close-open"
		const selectItems = [
			{
				key: "close-open",
				label: "隔日换仓：尾盘卖出->盘后选股->早盘买入",
				isDisabled: false,
			},
			{
				key: "open",
				label: "早盘换仓：盘后选股->早盘换仓(卖出后买入)",
				isDisabled: false,
			},
			// {
			// 	key: "close",
			// 	label: "尾盘换仓：盘中选股->立即换仓(卖出后买入)",
			// 	isDisabled: true,
			// },
		]
		const index = selectItems.findIndex((item) => item.key === rebalance_time)

		if (index === -1) {
			for (const item of selectItems) {
				item.isDisabled = true
			}
			const [startTime, endTime] = rebalance_time.split("-") // 使用 '-' 分割字符串
			let label = rebalance_time
			if (startTime === endTime) {
				// 如果前后两段相同
				label = `${startTime.slice(0, 2)}点${startTime.slice(2)}换仓：盘后选股->开盘后${startTime.slice(0, 2)}:${startTime.slice(2)}换仓(卖出后买入)`
			}
			selectItems.push({
				key: rebalance_time,
				label: label,
				isDisabled: false,
			})
		} else {
			selectItems.push({
				key: "",
				label: "支持自定义换仓，请去config.py文件中配置",
				isDisabled: true,
			})
		}

		return selectItems
	}

	const getFallbackPositionLabel = (value: number | null) => {
		const newValue = value ?? -1
		switch (newValue) {
			case -1:
				return "不设置"
			case 0:
				return "不开仓"
			case 1:
				return "满仓"
			default:
				return `${(newValue * 100).toFixed(0)}% 仓位`
		}
	}

	return (
		<Form {...form}>
			<form>
				<CardContent className="p-0">
					<div
						className="flex flex-col gap-4 overflow-auto min-h-[250px] max-h-[550px] p-4"
						style={{ height: "calc(100vh * 0.6)" }}
					>
						<FormField
							control={form.control}
							name="select_num"
							render={({ field, formState }) => (
								<FormItem>
									<FormControl>
										<Input
											type="number"
											{...field}
											value={field.value?.toString()}
											min={1}
											label="选股数量"
											isRequired
											variant="bordered"
											errorMessage={formState.errors.select_num?.message}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="hold_period"
							render={({ field }) => (
								<FormItem>
									<Select
										isRequired
										className="relative z-50"
										variant="bordered"
										selectedKeys={[field.value!]}
										onChange={(e) => {
											const new_value = e.target.value
											if (!new_value) return

											form.setValue("offset_list", "0")
											field.onChange(e)
										}}
										label="持仓周期"
									>
										<SelectSection title="日级别">
											{ALLOWED_HOLD_PERIODS.day.map((item: string) => (
												<SelectItem key={item}>{item}</SelectItem>
											))}
										</SelectSection>

										<SelectSection title="周级别">
											{ALLOWED_HOLD_PERIODS.week.map((item: string) => (
												<SelectItem key={item}>{item}</SelectItem>
											))}
										</SelectSection>

										<SelectSection title="月级别">
											{ALLOWED_HOLD_PERIODS.month.map((item: string) => (
												<SelectItem key={item}>{item}</SelectItem>
											))}
										</SelectSection>
									</Select>
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="offset_list"
							render={({ field, formState }) => (
								<FormItem>
									<FormControl>
										<Input
											{...field}
											isRequired
											variant="bordered"
											label={
												<>
													<span className="mr-1">offset_list</span>
													<span className="text-xs">
														多个数字用逗号分隔，如：0,1,2（不支持直接编辑）
													</span>
												</>
											}
											readOnly
											errorMessage={formState.errors.offset_list?.message}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="scalein_targets"
							render={({ field }) => (
								<FormItem className="border-2 rounded-md px-3 py-2">
									<div className="space-y-1 ">
										<span className="text-xs">
											分批进场目标仓位(offset间仓位分配) （不支持直接编辑）
										</span>
										{field.value && field.value?.length > 0 ? (
											<ScaleinTargetsView scaleinTargetsValue={field.value} />
										) : (
											<div className="text-sm">未配置</div>
										)}
									</div>
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="rebalance_time"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormControl>
										<Select
											className="relative z-60"
											{...field}
											label={
												<>
													换仓时间
													<span className="text-xs ml-1">
														新手建议使用早盘换仓模式
													</span>
												</>
											}
											isRequired
											variant="bordered"
											selectedKeys={[field.value!]}
											onChange={(e) => {
												const new_value = e.target.value
												if (!new_value) return
												// console.log("v", new_value)

												const { sell_time, buy_time } = autoTradeTimeByRebTime(
													new_value ?? "close-open",
												) // -- 生成自动交易时间
												form.setValue("sell_time", sell_time)
												form.setValue("buy_time", buy_time)
												// console.log("sell_time", sell_time)
												// console.log("buy_time", buy_time)
												field.onChange(e)
											}}
										>
											{getRebalanceOptions().map((item) => (
												<SelectItem key={item.key} isDisabled={item.isDisabled}>
													{item.label}
												</SelectItem>
											))}
											{/* <SelectItem
												key="close-open"
												isDisabled={name.includes("定风波")}
											>
												{"隔日换仓：尾盘卖出->盘后选股->早盘买入"}
											</SelectItem>
											<SelectItem
												key="open"
												isDisabled={name.includes("定风波")}
											>
												{"早盘换仓：盘后选股->早盘换仓(卖出后买入)"}
											</SelectItem>
											<SelectItem key="close" isDisabled={true}>
												{"尾盘换仓：盘中选股->立即换仓(卖出后买入)"}
											</SelectItem>
											<SelectItem
												key="0935-0935"
												isDisabled={name.includes("定风波")}
											>
												{"9点35换仓：盘后选股->开盘后09:35换仓(卖出后买入)"}
											</SelectItem>
											<SelectItem
												key="0945-0945"
												isDisabled={name.includes("定风波")}
											>
												{"9点45换仓：盘后选股->开盘后09:45换仓(卖出后买入)"}
											</SelectItem>
											<SelectItem key="0955-0955">
												{"9点55换仓：盘后选股->开盘后09:55换仓(卖出后买入)"}
											</SelectItem> */}
										</Select>
									</FormControl>
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="factor_list"
							render={({ field }) => (
								<FormItem className={cn("flex flex-col px-1")}>
									<FormLabel className="flex items-center gap-1">
										<CircuitBoard className="size-4 mr-1" />
										选股因子列表{" "}
										<span className="text-xs">（暂不支持直接编辑）</span>
									</FormLabel>

									<div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
										<span>因子名称</span>
										<span>排序方式</span>
										<span>因子参数</span>
										<span>因子计算参数（比如权重）</span>
									</div>

									<div className="space-y-2">
										{field.value?.map(
											(
												factor: [string, boolean, any, string | number | null],
												index: number,
											) => (
												<div key={index} className="grid grid-cols-4 gap-2">
													<FormControl>
														<InputUI
															value={factor[0]} // -- 因子名称
															className="text-muted-foreground text-xs"
															readOnly
														/>
													</FormControl>
													<FormControl>
														<InputUI
															value={
																factor[1] ? "从小到大排序" : "从大到小排序"
															} // -- 排序方式
															className="text-muted-foreground text-xs"
															readOnly
														/>
													</FormControl>
													<FormControl>
														<InputUI
															value={
																factor[2] !== null
																	? JSON.stringify(factor[2])
																	: "无参数"
															} // -- 因子参数
															className="text-muted-foreground text-xs font-mono"
															readOnly
														/>
													</FormControl>
													<FormControl>
														<InputUI
															value={factor[3] ?? ""} // -- 因子计算参数（比如权重）
															className="text-muted-foreground text-xs"
															readOnly
														/>
													</FormControl>
												</div>
											),
										)}
									</div>

									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="filter_list"
							render={({ field }) => (
								<FormItem className={cn("flex flex-col px-1")}>
									<FormLabel className="flex items-center gap-1">
										<Filter className="size-4 mr-1" />
										过滤因子列表
										<span className="text-xs">（暂不支持直接编辑）</span>
									</FormLabel>

									<div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
										<span>因子名称</span>
										<span>因子参数</span>
										<span>过滤条件</span>
										<span>排序方式</span>
									</div>
									<div className="space-y-2">
										{field.value?.map(
											(
												filter: [
													string, // 因子名称
													any, // 因子参数
													string, // 过滤条件
													boolean | undefined, // 排序方式
												],
												index: number,
											) => (
												<div key={index} className="grid grid-cols-4 gap-2">
													<FormControl>
														<InputUI
															value={filter[0]} // -- 因子名称
															className="text-muted-foreground text-xs"
															readOnly
														/>
													</FormControl>
													<FormControl>
														<InputUI
															value={JSON.stringify(filter[1])} // -- 因子参数
															className="text-muted-foreground text-xs font-mono"
															readOnly
														/>
													</FormControl>
													<FormControl>
														<InputUI
															value={filter[2]} // -- 过滤条件
															className="text-muted-foreground text-xs"
															readOnly
														/>
													</FormControl>
													<FormControl>
														<InputUI
															value={
																filter[3] === undefined
																	? "从小到大排序"
																	: filter[3]
																		? "从小到大排序"
																		: "从大到小排序"
															} // -- 启用状态
															className="text-muted-foreground text-xs"
															readOnly
														/>
													</FormControl>
												</div>
											),
										)}
									</div>

									<FormMessage />
								</FormItem>
							)}
						/>
						<hr />
						<div className="border-1 border-primary p-2 rounded-lg flex flex-col gap-4">
							<Tabs
								value={tabValue}
								onValueChange={(value) => setTabValue(value)}
							>
								<TabsList>
									<TabsTrigger value="进场">择时进场</TabsTrigger>
									<TabsTrigger value="离场">择时离场</TabsTrigger>
								</TabsList>
							</Tabs>
							{(tabValue === "进场" && form.getValues("timing")) ||
							(tabValue === "离场" && form.getValues("override")) ? (
								<>
									<FormField
										key={`${tabValue}-1`}
										control={form.control}
										name={tabValue === "进场" ? "timing" : "override"}
										render={({ field }) => (
											<FormItem className={cn("flex flex-col px-1")}>
												<FormLabel className="flex items-center gap-1">
													<Timer className="size-4 mr-1" />
													择时{tabValue}设置
													<span className="text-xs">
														（择时策略参数与择时策略具体实现有关）
													</span>
												</FormLabel>

												<div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
													<span>策略名称</span>
													<span>因子计算的股票范围</span>
													<span>策略参数</span>
													<span>计算择时的时间</span>
												</div>

												<div className="grid grid-cols-4 gap-2">
													<FormControl>
														<InputUI
															value={field.value?.name}
															className="text-muted-foreground text-xs"
															readOnly
														/>
													</FormControl>
													<FormControl>
														<InputUI
															value={field.value?.limit}
															className="text-muted-foreground text-xs"
															readOnly
														/>
													</FormControl>
													<FormControl>
														<InputUI
															value={JSON.stringify(field.value?.params)}
															className="text-muted-foreground text-xs"
															readOnly
														/>
													</FormControl>
													<FormControl>
														<InputUI
															value={
																!field.value?.signal_time ||
																field.value?.signal_time === "close"
																	? signalTime
																	: "close"
															}
															className="text-muted-foreground text-xs"
															readOnly
														/>
													</FormControl>
												</div>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										key={`${tabValue}-2`}
										control={form.control}
										name={tabValue === "进场" ? "timing" : "override"}
										render={({ field }) => (
											<FormItem className={cn("flex flex-col px-1")}>
												<FormLabel className="flex items-center gap-1">
													<AlarmClockCheck className="size-4 mr-1" />
													择时{tabValue}因子列表
													<span className="text-xs">（暂不支持直接编辑）</span>
												</FormLabel>

												<div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground">
													<span>因子名称</span>
													<span>排序方式</span>
													<span>因子参数</span>
													<span>因子计算参数</span>
													<span>分钟数据</span>
												</div>

												<div className="space-y-2">
													{field.value?.factor_list.map((factor, index) => (
														<div key={index} className="grid grid-cols-5 gap-2">
															<FormControl>
																<InputUI
																	value={factor[0]} // -- 因子名称
																	className="text-muted-foreground text-xs"
																	readOnly
																/>
															</FormControl>
															<FormControl>
																<InputUI
																	value={
																		factor[1] ? "从小到大排序" : "从大到小排序"
																	} // -- 排序方式
																	className="text-muted-foreground text-xs"
																	readOnly
																/>
															</FormControl>
															<FormControl>
																<InputUI
																	value={
																		factor[2] !== null
																			? JSON.stringify(factor[2])
																			: "无参数"
																	} // -- 因子参数
																	className="text-muted-foreground text-xs font-mono"
																	readOnly
																/>
															</FormControl>
															<FormControl>
																<InputUI
																	value={factor[3]} // -- 因子计算参数（比如权重）
																	className="text-muted-foreground text-xs"
																	readOnly
																/>
															</FormControl>
															<FormControl>
																<InputUI
																	value={factor[4] || "close"} // -- 分钟数据
																	className="text-muted-foreground text-xs"
																	readOnly
																/>
															</FormControl>
														</div>
													))}
												</div>

												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										key={`${tabValue}-3`}
										control={form.control}
										name={tabValue === "进场" ? "timing" : "override"}
										render={({ field }) => (
											<FormItem className={cn("px-1")}>
												<FormLabel className="flex items-center gap-1">
													<Shell className="size-4 mr-1" />
													择时{tabValue}默认仓位
													<span className="text-xs">
														（当因各种原因无法按时算出择时信号的时候的默认仓位）
													</span>
												</FormLabel>
												<FormControl>
													<InputUI
														value={getFallbackPositionLabel(
															field.value?.fallback_position ?? -1,
														)}
														className="text-muted-foreground text-xs"
													/>
												</FormControl>
												<p className="text-muted-foreground text-xs">
													{(field.value?.fallback_position ?? -1) === -1
														? "会依据因子具体数值安排仓位"
														: ""}
												</p>
											</FormItem>
										)}
									/>
								</>
							) : (
								<div className="flex flex-col gap-1 bg-gray-100 border p-2 rounded-lg dark:bg-black">
									<h3 className="text-sm flex items-center gap-1">
										<Timer className="size-4 mr-1" />
										无择时{tabValue}配置
									</h3>
									<p className="text-muted-foreground text-xs">
										择时策略参数与择时策略具体实现有关，请先配置择时策略
									</p>
								</div>
							)}
						</div>
						<hr />
						<div className="flex flex-col gap-3 bg-gray-100 border p-2 rounded-lg dark:bg-black">
							<h3 className="text-sm text-warning-600 dark:text-warning flex items-center gap-1">
								<Biohazard className="size-4 mr-1 font-bold" />
								以下为高阶配置，默认会自动随机生成，无需手动设置。如果你不太了解，千万不要修改！
							</h3>
							<FormField
								control={form.control}
								name="split_order_amount"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel className="flex items-center gap-1">
											<span>🧬 拆单金额</span>
											<ButtonTooltip content="拆单金额默认在 6000 到 12000 之间随机取值">
												<CircleHelp className="w-4 h-4 text-muted-foreground hover:cursor-pointer" />
											</ButtonTooltip>
										</FormLabel>

										<FormControl>
											<InputUI
												{...field}
												type="number"
												min={6000}
												max={12000}
												className="bg-background"
											/>
										</FormControl>

										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="sell_time"
								render={({ field }) => (
									// TODO: 删除 hidden
									<FormItem className="flex flex-col">
										<FormLabel className="flex items-center gap-1">
											<span>🈳 卖出时间</span>
											<ButtonTooltip content="保存时随机生成，或点击下方按钮随机生成">
												<CircleHelp className="w-4 h-4 text-muted-foreground hover:cursor-pointer" />
											</ButtonTooltip>
										</FormLabel>

										<FormControl>
											<TimePicker {...field} granularity="second" isReadOnly />
										</FormControl>
										<p className="text-muted-foreground text-xs pl-1">
											当日换仓：根据换仓时间的 前1分钟 到
											后10分钟，并随机秒数；隔日换仓：收盘前10分钟内随机，并随机秒数
										</p>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="buy_time"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel className="flex items-center gap-1">
											<span>🈵 买入时间</span>
											<ButtonTooltip content="保存时随机生成，或点击下方按钮随机生成">
												<CircleHelp className="w-4 h-4 text-muted-foreground hover:cursor-pointer" />
											</ButtonTooltip>
										</FormLabel>

										<FormControl>
											<TimePicker {...field} isReadOnly granularity="second" />
										</FormControl>
										<p className="text-muted-foreground text-xs pl-1">
											分钟换仓：根据随机后的卖出时间，延迟 60 到 120
											秒随机间隔；其他换仓：按开盘时间，随机买入时间
										</p>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button
								size="sm"
								variant="outline"
								className="w-52"
								onClick={(e) => {
									e.preventDefault()
									const { sell_time, buy_time } = autoTradeTimeByRebTime(
										form.getValues("rebalance_time") ?? "close-open",
									)
									form.setValue("sell_time", sell_time)
									form.setValue("buy_time", buy_time)
								}}
							>
								<Shuffle className="w-4 h-4 mr-2" />
								随机生成买入、卖出时间
							</Button>
						</div>
					</div>
				</CardContent>

				<CardFooter className="flex justify-end border-t p-4">
					<Button
						onClick={async (e) => {
							e.preventDefault()
							setSaving(true)
							await handleSubmit()
						}}
						disabled={saving}
					>
						{saving ? (
							<>
								<Loader className="animate-spin h-5 mr-2" /> 保存中...
							</>
						) : (
							submitText
						)}
					</Button>
				</CardFooter>
			</form>
		</Form>
	)
}
