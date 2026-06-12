/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { useDataSubscribed } from "@/renderer/hooks/useDataSubscribed"
import type { IDataListType } from "@/renderer/schemas/data-schema"
import { dataApiProductsAtom, localProductsAtom } from "@/renderer/store/query"
import { useAtom } from "jotai"
import { useCallback, useMemo } from "react"

/**
 * 提供一份结合API返回值、本地的数据状态、白名单的数据列表，返回一个产品信息列表
 * refresh函数，会触发API的刷新，以及本地数据状态的刷新，然后返回一个产品信息列表
 */
export function useProductList() {
	const realtimeList = ["stock-1h-trading-data-daily"] //实时更新数据的名单
	const [
		{ data: dataApi, refetch: fetchDataApi, isFetching: isFetchingDataApi },
	] = useAtom(dataApiProductsAtom)
	const [
		{
			data: localProductList,
			refetch: loadLocalProducts,
			isFetching: isLoadingLocalProducts,
		},
	] = useAtom(localProductsAtom)
	const { dataSubscribedNameList } = useDataSubscribed()

	// -- 辅助函数：格式化日期时间字符串
	const formatDateTime = (dateTimeString: string): string => {
		const [year, month, day, hour, minute] = dateTimeString.split("-")
		return `${year}-${month}-${day} ${hour}:${minute}`
	}

	const apiProductList = useMemo(() => {
		return dataApi?.rawData || []
	}, [dataApi])

	const subscribedApiProductList = useMemo(() => {
		return apiProductList.filter((item) =>
			dataSubscribedNameList.includes(item.name),
		)
	}, [apiProductList, dataSubscribedNameList])

	/**
	 * 根据API返回值、本地的数据状态、白名单的数据列表，返回一个产品信息列表
	 */
	const productList = useMemo(() => {
		// 过滤出符合白名单的产品信息
		const filteredProductInfoList = subscribedApiProductList.map((item) => ({
			...item,
			canAutoUpdate: 0,
			dataContentTime: "--:--:--",
			dataTime: "--:--:--",
			lastUpdateTime: "--:--:--",
		}))

		const localProductMap = (localProductList || []).reduce(
			(acc, status) => {
				acc[status!.name] = status
				return acc
			},
			{} as { [key: string]: IDataListType | undefined },
		)

		// 遍历 filteredProductInfoList，添加 dataContentTime 和 dataTime
		const finalProductInfoList = filteredProductInfoList.map((item) => {
			const updateStatus = localProductMap[item.name]
			// 如果是实时更新的产品，处理相关字段
			if (realtimeList.includes(item.name)) {
				return {
					...item,
					dataTime: updateStatus?.lastUpdateTime, // 使用 lastUpdateTime 更新 dataTime
					dataContentTime: updateStatus?.ts
						? formatDateTime(updateStatus?.ts)
						: updateStatus?.dataContentTime, // 使用 ts 或者 dataContentTime
					canAutoUpdate: updateStatus?.canAutoUpdate,
					lastUpdateTime: updateStatus?.lastUpdateTime,
				}
			}
			return {
				...item,
				canAutoUpdate: updateStatus?.canAutoUpdate,
				dataContentTime: updateStatus?.dataContentTime,
				dataTime: updateStatus?.dataTime,
				lastUpdateTime: updateStatus?.lastUpdateTime,
			}
		})
		return finalProductInfoList
	}, [subscribedApiProductList, localProductList])

	const isUpdating = useMemo(() => {
		return isLoadingLocalProducts || isFetchingDataApi
	}, [isLoadingLocalProducts, isFetchingDataApi])

	const update = useCallback(() => {
		fetchDataApi()
		loadLocalProducts()
	}, [fetchDataApi, loadLocalProducts])

	return {
		productList,
		apiProductList,
		dataSubscribedNameList,
		isUpdating,
		update,
		fetchDataApi,
		loadLocalProducts,
	}
}
