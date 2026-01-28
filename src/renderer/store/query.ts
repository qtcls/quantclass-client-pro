/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { isWindows } from "@/renderer/constant"
import type { IDataListType } from "@/renderer/schemas/data-schema"
import { atomWithQuery } from "jotai-tanstack-query"

const { VITE_XBX_ENV, VITE_BASE_URL } = import.meta.env
const {
	fetchMonitorProcesses,
	fetchRocketStatus,
	queryDataList,
	loadAccount,
	loadProductStatus,
	rendererLog,
	getStoreValue,
} = window.electronAPI

export const rocketStatusQueryAtom = atomWithQuery(() => ({
	queryKey: ["fetch-rocket-status"],
	queryFn: () => fetchRocketStatus(),
	enabled: isWindows && VITE_XBX_ENV !== "development",
	refetchInterval:
		isWindows && VITE_XBX_ENV !== "development" ? 5 * 1000 : false,
}))

export const monitorProcessesQueryAtom = atomWithQuery(() => ({
	queryKey: ["fetch-monitor-process"],
	queryFn: () => fetchMonitorProcesses(),
	refetchInterval: 5 * 1000,
}))

export const loadAccountQueryAtom = atomWithQuery(() => ({
	queryKey: ["load-account"],
	queryFn: () => loadAccount(),
	enabled: false,
	refetchInterval: 90 * 1000,
}))

export const strategyListQueryAtom = atomWithQuery(() => ({
	queryKey: ["strategy-list"],
	queryFn: () =>
		queryDataList({
			cur: 1,
			pageSize: 200,
			file_name: "strategy.json",
		}),
}))

export const productStatusAtom = atomWithQuery(() => ({
	queryKey: ["product-status"],
	enabled: false,
	staleTime: Number.POSITIVE_INFINITY,
	gcTime: Number.POSITIVE_INFINITY,
	queryFn: async () => {
		const port = await getStoreValue("server_port", 8787)
		// 1. 获取产品状态
		const res = await fetch(`http://localhost:${port}/product-status`)
		if (!res.ok) {
			rendererLog(
				"warning",
				`获取产品状态失败 status: ${res.status} ${res.statusText}`,
			)
			return {
				statusData: [],
				exitData: [],
			}
		}
		const json = await res.json()
		if (json.code === 500) {
			rendererLog("warning", json.message)
			return {
				statusData: [],
				exitData: [],
			}
		}
		const statusData = json.data as IDataListType[]

		// 2. 获取本地状态
		const localStatus = await loadProductStatus()
		const exitData = Object.values(localStatus)

		return {
			statusData,
			exitData,
		}
	},
}))

/**
 * 主要用于监听 productStatusAtom 的数据变化，并将 statusData、exitData 与 dataMapAtom 中的数据进行合并同步。
 *
 * 具体流程如下：
 * 1. 通过 get(productStatusAtom) 获取产品状态的异步查询结果。
 * 2. 如果没有数据（result?.data），直接返回，不做任何处理。
 * 3. 拿到 statusData（远程产品状态）和 exitData（本地产品状态），以及 dataMap（本地数据映射）。
 * 4. 遍历 dataMap，将每一项 item 与 statusData、exitData 中 name 字段相同的对象合并（浅合并，后者覆盖前者）。
 *    - 这里通过 find 方法查找 name 匹配的对象，并用对象展开运算符合并属性。
 *    - 由于 statusData、exitData 的类型不明确，若 find 没有找到，返回 undefined，展开不会报错但不会添加属性。
 * 5. 过滤掉 name 不存在的项，保证 mergedData 只包含有效数据。
 * 6. 最后 set(dataMapAtom, mergedData) 更新 dataMapAtom，实现数据同步。
 *
 * 注意：
 * - 这里的类型推断不够严格，可能导致 TS 报错（如 name 可能不存在于 {}），建议为 dataMap、statusData、exitData 明确类型。
 * - 若 statusData、exitData 中找不到对应项，展开 undefined 不会报错，但不会添加属性。
 * - 该 effect 只在 productStatusAtom 数据变化时触发，保证数据一致性。
 */

// -- 抽取数据处理逻辑
export interface RecordType {
	key: string
	title: string
	fullData: string
	description: string
	course_access?: string[]
}
export function processData(data: any[]) {
	const mockData = data
		.map((item) => ({
			key: item.name,
			title: item.displayName,
			fullData: item.fullData,
			description: item.displayName,
			course_access: item.course_access,
		}))
		.filter((item) => item.key !== "data-api")

	const groupedData = mockData.reduce(
		(acc, item) => {
			const access = Array.isArray(item.course_access)
				? item.course_access[0]?.replace(/['\[\]]/g, "") || "other"
				: item.course_access || "other"

			if (!acc[access]) {
				acc[access] = []
			}
			acc[access].push(item)
			return acc
		},
		{} as Record<string, RecordType[]>,
	)

	return Array.from(
		new Map(
			Object.entries(groupedData)
				.sort(([groupA], [groupB]) => {
					const priority = {
						coin: 0,
						stock: 1,
						fen: 2,
						other: 3,
					}
					return (
						(priority[groupA as keyof typeof priority] ?? 99) -
						(priority[groupB as keyof typeof priority] ?? 99)
					)
				})
				.flatMap(([_, items]) => items)
				.map((item) => [item.key, item]),
		).values(),
	)
}

// -- 创建查询 atom
export const dataApiProductsAtom = atomWithQuery(() => ({
	queryKey: ["data-api-products"],
	queryFn: async () => {
		const response = await fetch(
			"https://quantclass.cn-sh2.ufileos.com/sapi/data/products-status.json",
		)
		const json = await response.json()

		return {
			rawData: json?.data,
			data: processData(json?.data),
		}
	},
	enabled: true,
	gcTime: Number.POSITIVE_INFINITY,
	staleTime: 3000, // 3秒内数据被认为是新鲜的，不会重新请求
}))

// 获取数据更新时间
export const localProductsAtom = atomWithQuery(() => ({
	queryKey: ["product-update-status"],
	queryFn: async () => {
		try {
			const result = await loadProductStatus()
			return Object.values(result)
		} catch (error) {
			return null
		}
	},
	enabled: true,
	gcTime: Number.POSITIVE_INFINITY,
	refetchInterval: 1000 * 60 * 60, // 1小时重新请求一次
	staleTime: 3000, // 3秒内数据被认为是新鲜的，不会重新请求
}))
