/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { IDataListType } from "@/renderer/schemas/data-schema"
import { dataSubscribedAtom } from "@/renderer/store/electron"
import { dataApiProductsAtom } from "@/renderer/store/query"
import { useAtom } from "jotai"
import { compact } from "lodash-es"
import { useCallback, useMemo } from "react"
import { useSettings } from "./useSettings"

function uniqSorted(arr: string[]): string[] {
	return Array.from(new Set(arr)).sort()
}

interface RecycleBinAppendRestoreResult {
	ok: boolean
	restored: number
	skipped: string[]
	error?: string
}

export function useDataSubscribed() {
	const [dataSubscribed, setDataSubscribed] = useAtom(dataSubscribedAtom)
	const [{ data: dataApi, refetch: refetchDataApi }] =
		useAtom(dataApiProductsAtom)
	const { settings, updateSettings } = useSettings()

	const isSubscribed = useCallback(
		(data: IDataListType | string) => {
			const name = typeof data === "string" ? data : data.name
			return dataSubscribed.some((item) => item.name === name)
		},
		[dataSubscribed],
	)

	const setDataSubscribedNameList = useCallback(
		(selection: Record<string, boolean>) => {
			const selectedNames = Object.keys(selection).filter(
				(key) => selection[key] === true,
			)
			const data = compact(
				dataApi?.data.map((item) =>
					selectedNames.includes(item.key)
						? {
								name: item.key,
								displayName: item.description,
								fullData: item.fullData,
								isAutoUpdate: 1,
							}
						: undefined,
				),
			)
			setDataSubscribed(data as IDataListType[])
			updateSettings({ data_white_list: selectedNames })
		},
		[dataApi],
	)

	// -- 回收站恢复：在现有订阅上追加 data_map 项与白名单
	const appendDataSubscribedFromRecycleBin = useCallback(
		async (names: string[]): Promise<RecycleBinAppendRestoreResult> => {
			const safe = uniqSorted(names.filter(Boolean))
			if (safe.length === 0) {
				return { ok: true, restored: 0, skipped: [] }
			}

			let catalog = dataApi?.data ?? []
			if (catalog.length === 0) {
				const refetched = await refetchDataApi()
				catalog = refetched.data?.data ?? []
			}
			if (catalog.length === 0) {
				return {
					ok: false,
					restored: 0,
					skipped: safe,
					error: "数据目录未加载，请稍后重试",
				}
			}

			const catalogByKey = new Map(catalog.map((item) => [item.key, item]))
			const mapHas = new Set(dataSubscribed.map((d) => d.name))
			const listHas = new Set(settings.data_white_list ?? [])

			const mapAdds: IDataListType[] = []
			const skipped: string[] = []

			for (const name of safe) {
				if (mapHas.has(name)) continue
				const record = catalogByKey.get(name)
				if (!record) {
					skipped.push(name)
					continue
				}
				mapAdds.push({
					name: record.key,
					displayName: record.description,
					fullData: record.fullData,
					isAutoUpdate: 1,
				})
				mapHas.add(name)
			}

			const restoredSet = new Set(mapAdds.map((d) => d.name))
			const forList = safe.filter(
				(n) => !listHas.has(n) && (mapHas.has(n) || restoredSet.has(n)),
			)

			if (mapAdds.length > 0) {
				setDataSubscribed((prev) => [...prev, ...mapAdds])
			}
			if (forList.length > 0) {
				updateSettings({
					data_white_list: uniqSorted([
						...(settings.data_white_list ?? []),
						...forList,
					]),
				})
			}

			return {
				ok: true,
				restored: forList.length,
				skipped,
			}
		},
		[
			dataApi,
			dataSubscribed,
			refetchDataApi,
			setDataSubscribed,
			settings.data_white_list,
			updateSettings,
		],
	)

	const removeDataSubscribed = useCallback(
		(data: IDataListType) => {
			setDataSubscribed((prev) => {
				const next = prev.filter((item) => item.name !== data.name)
				updateSettings({ data_white_list: next.map((item) => item.name) })
				return next
			})
		},
		[setDataSubscribed],
	)

	const resetDataSubscribed = useCallback(() => {
		setDataSubscribed([])
		updateSettings({ data_white_list: [] })
	}, [setDataSubscribed, updateSettings])

	const dataSubscribedNameList = useMemo(() => {
		return dataSubscribed.map((item) => item.name)
	}, [dataSubscribed])

	return {
		dataSubscribed,
		dataSubscribedNameList,
		setDataSubscribedNameList,
		setDataSubscribed,
		appendDataSubscribedFromRecycleBin,
		removeDataSubscribed,
		resetDataSubscribed,
		isSubscribed,
	}
}
