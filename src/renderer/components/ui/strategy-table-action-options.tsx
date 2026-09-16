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
import { Button } from "@/renderer/components/ui/button"
import { DataTableToolbar } from "@/renderer/components/ui/data-table-toolbar"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/renderer/components/ui/form"
import {
	RadioGroup,
	RadioGroupItem,
} from "@/renderer/components/ui/radio-group"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/renderer/components/ui/select"
import { usePermissionCheck, useStrategyOptions } from "@/renderer/hooks"
import type { DataTableActionOptionsProps } from "@/renderer/page/data/table/options"
import { zodResolver } from "@hookform/resolvers/zod"
import { ReloadIcon } from "@radix-ui/react-icons"
import { useMutation } from "@tanstack/react-query"
import { useUnmount } from "etc-hooks"
import { compact } from "lodash-es"
import { ArrowDownNarrowWideIcon, Edit3Icon } from "lucide-react"
import type { FC } from "react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

export type StrategyTableActionOptionsProps<TData> =
	DataTableActionOptionsProps<TData>

export const StrategyModalSchema = z.object({
	stock_check: z.string(),
	cycle_check: z.string(),
	strategy_select: z.string(),
})

const {
	handleUpdateStrategies,
	fetchFuelStatus,
	createTerminalWindow,
	rendererLog,
	setStoreValue,
	getStoreValue,
} = window.electronAPI

export function StrategyTableActionOptions<TData>(
	props: StrategyTableActionOptionsProps<TData>,
) {
	const { refresh } = props
	const { checkWithToast } = usePermissionCheck()
	const { mutateAsync: updateStrategies, isPending: loading } = useMutation({
		mutationKey: ["update-strategies"],
		mutationFn: async () => await handleUpdateStrategies(),
		onSuccess: () => {
			refresh?.()
			toast.success("更新成功")
		},
		onError: (error) => {
			rendererLog("error", `策略数据手动更新失败：${error.message}`)
			toast.error("更新失败")
		},
	})

	return (
		<DataTableToolbar {...props} enableSearch={false}>
			<AddStrategyDialog refresh={refresh!} />

			<Button
				size="sm"
				variant="outline"
				className="h-8 text-foreground lg:flex"
				onClick={async () => {
					// -- 权限检查
					if (!checkWithToast({ requireMember: true }).isValid) {
						return
					}

					const fuelStatus = await fetchFuelStatus()
					if (fuelStatus) {
						toast.info("已在自动更新，请稍候...")
						return
					}

					createTerminalWindow()
					await updateStrategies()
				}}
			>
				<ArrowDownNarrowWideIcon size={14} className="mr-2" />
				更新策略
			</Button>

			<Button
				size="sm"
				variant="outline"
				className="h-8 text-foreground lg:flex"
				onClick={refresh}
			>
				<ReloadIcon className="mr-2 h-4 w-4" />
				刷新列表
			</Button>

			<LoadingAnime loading={loading} />
		</DataTableToolbar>
	)
}

const AddStrategyDialog: FC<{ refresh: () => void }> = ({ refresh }) => {
	const [open, setOpen] = useState(false)
	const { checkWithToast } = usePermissionCheck()
	const form = useForm<z.infer<typeof StrategyModalSchema>>({
		mode: "onSubmit",
		resolver: zodResolver(StrategyModalSchema),
	})
	const watchSelect = form.watch("strategy_select")
	const {
		data: strategy_select,
		cycleOptions,
		stockOptions,
		selectOptions,
		reset,
		resetAll,
	} = useStrategyOptions(open, watchSelect)

	const { mutateAsync: handleSubmit, isPending } = useMutation({
		mutationKey: ["add-strategy"],
		mutationFn: async (data: z.infer<typeof StrategyModalSchema>) => {
			const prev_strategy_white_list = (await getStoreValue(
				"settings.strategy_white_list",
				[],
			)) as string[]
			const values = [
				data?.strategy_select,
				data?.cycle_check,
				data?.stock_check,
			].join("&")
			const strategy_white_list = prev_strategy_white_list.concat(values)
			const strategy_res = compact(
				strategy_white_list.map((item) => {
					const [name, period] = item.split("&")
					const displayName = strategy_select.filter(
						(item) => item.name === name,
					)[0]?.fullName

					return {
						key: item,
						name,
						period,
						displayName,
					}
				}),
			)

			// -- 存入配置
			setStoreValue("strategy_map", strategy_res)
			setStoreValue("settings.strategy_white_list", strategy_white_list)

			return strategy_res
		},
		onSuccess: () => {
			form.reset()
			refresh()
			setOpen(false)
		},
	})

	const onSubmit = async (data: z.infer<typeof StrategyModalSchema>) => {
		await handleSubmit(data)
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies:
	useEffect(() => {
		reset()
	}, [open])

	useUnmount(() => {
		resetAll()
	})

	return (
		<Dialog open={open} onOpenChange={(_open) => setOpen(_open)}>
			<Button
				size="sm"
				variant="outline"
				onClick={() => {
					// -- 权限检查
					if (!checkWithToast({ requireMember: true }).isValid) {
						return
					}
					setOpen(true)
				}}
				className="ml-auto h-8 text-foreground lg:flex"
			>
				<Edit3Icon size={14} className="mr-2" /> 新增订阅
			</Button>

			<DialogContent>
				<DialogHeader>
					<DialogTitle>新增策略订阅</DialogTitle>
					<DialogDescription>在此添加你需要订阅的策略情况</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<FormField
							control={form.control}
							name="strategy_select"
							rules={{ required: true }}
							render={({ field }) => (
								<FormItem className="mb-2">
									<FormLabel>选择策略</FormLabel>

									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="选择策略" />
											</SelectTrigger>
										</FormControl>

										<SelectContent className="max-h-[250px]">
											{selectOptions.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							name="cycle_check"
							control={form.control}
							rules={{ required: true }}
							render={({ field }) => (
								<FormItem className="mb-2">
									<FormLabel>换仓周期</FormLabel>

									<FormControl>
										<RadioGroup
											className="flex gap-4"
											defaultValue={field.value}
											onValueChange={field.onChange}
										>
											{cycleOptions.map((option) => (
												<FormItem
													key={option.value}
													className="flex items-center space-x-3 space-y-0"
												>
													<FormControl>
														<RadioGroupItem value={option.value} />
													</FormControl>
													<FormLabel className="font-normal hover:cursor-pointer">
														{option.label}
													</FormLabel>
												</FormItem>
											))}
										</RadioGroup>
									</FormControl>

									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							name="stock_check"
							control={form.control}
							rules={{ required: true }}
							render={({ field }) => (
								<FormItem className="mb-2">
									<FormLabel>选股个数</FormLabel>

									<FormControl>
										<RadioGroup
											className="flex gap-4"
											defaultValue={field.value}
											onValueChange={field.onChange}
										>
											{stockOptions.map((option) => (
												<FormItem
													key={option.value}
													className="my-0 flex items-center space-x-3 space-y-0"
												>
													<FormControl>
														<RadioGroupItem value={option.value} />
													</FormControl>
													<FormLabel className="font-normal hover:cursor-pointer">
														{option.label}
													</FormLabel>
												</FormItem>
											))}
										</RadioGroup>
									</FormControl>

									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button type="submit" disabled={isPending}>
								{isPending ? (
									<>
										<ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
										添加中...
									</>
								) : (
									"添加策略"
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
