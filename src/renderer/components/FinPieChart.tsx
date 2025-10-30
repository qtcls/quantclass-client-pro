/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { ChartConfig } from "@/renderer/components/ui/chart"
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/renderer/components/ui/chart"
import { selectStgListAtom, totalWeightAtom } from "@/renderer/store/storage"
import { Label, Pie, PieChart } from "recharts"

// import { useQuery } from "@tanstack/react-query"
import { useAtomValue } from "jotai"
import { useCallback, useMemo } from "react"

export type Account = {
	总资产: number
	持仓价值: number
	可用资金: number
	冻结资金: number
}

export function FinPieChart({
	withTitle = true,
	totalCap = -1,
	availCap = -1,
}: { withTitle?: boolean; totalCap: number; availCap: number }) {
	const totalWeight = useAtomValue(totalWeightAtom)
	const selectStgList = useAtomValue(selectStgListAtom)

	// -- 动态生成 chartConfig
	const chartConfig = useMemo(() => {
		const config: ChartConfig = {
			可用资金: {
				label: "可用资金",
				color: "hsl(var(--chart-1))",
			},
		}

		// 添加选股策略
		{
			const filtered =
				selectStgList
					// ?.filter((item) => item.enable_real_market)
					?.filter((item) => item.cap_weight > 0) ?? []

			for (const [index, item] of filtered.entries()) {
				config[`${item.name}`] = {
					label: `${item.cap_weight}% ${item.name}`,
					color: `hsl(var(--chart-${((index + 2) % 10) + 1}))`,
				}
			}
		}

		return config
	}, [selectStgList, totalCap, availCap])

	const calculateChartData = useCallback(() => {
		const result: unknown[] = []
		let total = 0

		{
			const filtered =
				selectStgList
					// ?.filter((item) => item.enable_real_market)
					?.filter((item) => item.cap_weight > 0) ?? []

			for (const item of filtered) {
				total += item.cap_weight
				result.push({
					name: `${item.name}`,
					cap_weight: item.cap_weight,
					amount:
						totalCap < 0 ? item.cap_weight : totalCap * (item.cap_weight / 100),
					fill: chartConfig[`${item.name}`].color,
				})
			}
		}

		if (total !== totalWeight || totalWeight !== 100) {
			const key = "可用资金"
			result.push({
				name: key,
				cap_weight: 100 - total,
				amount: availCap < 0 ? 100 - total : availCap,
				fill: chartConfig[key].color,
			})
		}

		return result
	}, [selectStgList, totalWeight, totalCap, availCap])

	// const { data = [] } = useQuery({
	// 	queryKey: ["fin-pie-chart"],
	// 	queryFn: calculateChartData,
	// 	refetchInterval: 1000 * 1,
	// })

	return (
		<div className="flex flex-col items-center">
			{withTitle && (
				<h2 className="scroll-m-20 border-b pb-2 text-xl font-semibold tracking-tight first:mt-0">
					资金占比情况
				</h2>
			)}

			<ChartContainer
				config={chartConfig}
				className="mx-auto aspect-square max-h-[300px] min-w-[400px]"
			>
				<PieChart>
					<ChartTooltip
						cursor={false}
						content={
							<ChartTooltipContent
								formatter={(value, name) => (
									<div className="flex items-center justify-between gap-2">
										<span className="text-muted-foreground">{name}</span>
										<span className="font-mono font-medium">
											{Number(value).toFixed(2)}
											{totalCap < 0 ? "%" : "￥"}
										</span>
									</div>
								)}
							/>
						}
					/>
					<Pie
						data={calculateChartData()}
						dataKey="amount"
						nameKey="name"
						innerRadius={65}
					>
						<Label
							content={({ viewBox }) => {
								if (viewBox && "cx" in viewBox && "cy" in viewBox) {
									return (
										<text
											x={viewBox.cx}
											y={viewBox.cy}
											textAnchor="middle"
											dominantBaseline="middle"
										>
											<tspan
												x={viewBox.cx}
												y={viewBox.cy}
												className="fill-primary text-xl font-bold"
											>
												{}
												{availCap < 0
													? `${Number(100 - totalWeight).toFixed(2)}%`
													: `${availCap}¥`}
											</tspan>
											<tspan
												x={viewBox.cx}
												y={(viewBox.cy || 0) + 24}
												className="fill-muted-foreground"
											>
												可用资金
											</tspan>
										</text>
									)
								}
								return null
							}}
						/>
					</Pie>
					<ChartLegend
						content={
							<ChartLegendContent
								nameKey="name"
								className="[&>*]:justify-start [&>*]:!flex [&>*]:!flex-row [&>*]:!items-center [&>*]:!gap-2"
							/>
						}
						className="flex-col gap-2 max-h-[250px] overflow-y-auto items-start"
						layout="vertical"
						verticalAlign="middle"
						align="right"
						wrapperStyle={{
							right: -10,
							top: "50%",
							transform: "translateY(-50%)",
							width: "auto",
							minWidth: "130px",
							maxHeight: "250px",
							overflowY: "auto",
						}}
					/>
				</PieChart>
			</ChartContainer>

			<div className="mt-2 text-sm">
				资金已占用{" "}
				<span className="font-semibold text-primary">{totalWeight}%</span>
			</div>
		</div>
	)
}
