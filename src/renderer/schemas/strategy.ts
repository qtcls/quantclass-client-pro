/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { TimeValue } from "react-aria"
import { z } from "zod"

// ===== 基础共享字段 =====

export const NameSchema = z.string().min(1, {
	message: "请输入策略名称",
})

export const HoldPeriodSchema = z.string().min(1, {
	message: "请选择持仓周期",
})

export const SelectNumSchema = z
	.number()
	.positive({
		message: "选股数量必须大于0",
	})
	.or(
		z.string().regex(/^\d+$/, {
			message: "选股数量必须是大于 0 的数字",
		}),
	)

export const SelectNumFormSchema = z.union([z.number(), z.string()]).refine(
	(val) => {
		const num = typeof val === "string" ? Number(val) : val
		return !Number.isNaN(num) && num > 0
	},
	{
		message: "选股数量必须是大于 0 的数字",
	},
)

export const OffsetListSchema = z.array(z.number()).default([0])

export const OffsetListFormSchema = z.string().min(1, {
	message: "请输入偏移列表，多个数字用逗号分隔",
})

export const RebalanceTimeSchema = z.string().optional()

export const SplitOrderAmountSchema = z.number().positive()

export const SplitOrderAmountFormSchema = z
	.union([z.number(), z.string()])
	.refine(
		(val) => {
			const num = typeof val === "string" ? Number(val) : val
			return !Number.isNaN(num) && num > 0
		},
		{
			message: "分割订单金额必须大于0",
		},
	)

// ===== 因子相关 Schema =====
export const FactorItemSchema = z.tuple([
	z.string(), // 因子名称
	z.boolean(), // 排序方式
	// 因子参数
	z.any(),
	// 因子权重，后续拓展成了一个因子参数，和param等权，默认为权重1
	z.any(),
	// 因子权重，后续拓展成了一个因子参数，和param等权，默认为权重1
	z
		.union([z.string(), z.array(z.string())])
		.optional(), // 分钟数据为可选,
])

export const FilterConditionSchema = z
	.string()
	.regex(/^(val|pct|rank):(==|!=|<=|>=|<|>).+$/)

export const FilterItemSchema = z.tuple([
	z.string(), // 因子名称
	z.any(), // 因子参数
	FilterConditionSchema, // 过滤条件
	z.boolean().optional(),
])

// ===== 择时相关 Schema =====

export const TimingSchema = z
	.object({
		name: z.string(),
		limit: z.number(),
		factor_list: z.array(FactorItemSchema),
		params: z.any(),
		signal_time: z.string().optional(),
		recall_days: z.number().optional(),
		fallback_position: z.number().optional(),
	})
	.passthrough() // 允许额外的字段
	.optional()

// ===== 时间相关 Schema =====

export const TimeStringSchema = z.string()

export const TimeValueSchema = z.custom<TimeValue>()

// ===== 核心策略字段组合 =====
/**
 * 选股策略，和策略结构保持一致
 */
export const CoreStrategySchema = z.object({
	name: NameSchema,
	cap_weight: z.number().default(0),
	hold_period: HoldPeriodSchema,
	select_num: SelectNumSchema,
	offset_list: OffsetListSchema,
	rebalance_time: RebalanceTimeSchema,
	factor_list: z.array(z.any()),
	filter_list: z.array(z.any()),
	timing: TimingSchema,
	info: z.any().optional(), // 策略信息，用于存储策略的额外信息
})

export const SelectStgSchema = CoreStrategySchema.extend({
	buy_time: z.string(),
	sell_time: z.string(),
	update_time: z.string().optional(),
	split_order_amount: SplitOrderAmountSchema,
}).passthrough() // 允许额外的字段

export const SelectStgFormSchema = CoreStrategySchema.omit({ name: true })
	.extend({
		select_num: SelectNumFormSchema,
		buy_time: TimeValueSchema,
		sell_time: TimeValueSchema,
		offset_list: OffsetListFormSchema,
		split_order_amount: SplitOrderAmountFormSchema,
	})
	.passthrough() // 允许额外的字段
