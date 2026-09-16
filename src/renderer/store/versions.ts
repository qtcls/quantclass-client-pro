/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { useAtom } from "jotai"
import { atomEffect } from "jotai-effect"
import { atomWithQuery } from "jotai-tanstack-query"
import { atomWithStorage } from "jotai/utils"

const { getAppAndKernalVersions } = window.electronAPI

export const versionsAtom = atomWithStorage<
	Partial<{
		clientVersion: string // 客户端
		fuelVersion: string // 数据内核
		fusionVersion: string // 选股内核
		rocketVersion: string // 下单内核
		scmVersion: string // config 大师内核
	}>
>("versions", { clientVersion: "1.1.5" }, undefined, {
	getOnInit: true,
})

/**
 * 检查本地版本信息
 * @returns 本地版本信息和相关状态
 */
export const versionsQueryAtom = atomWithQuery(() => ({
	queryKey: ["local-versions"],
	queryFn: () => getAppAndKernalVersions(), // -- 获取本地版本信息
	enabled: true, // -- 挂载后立即请求
	refetchInterval: 1000 * 60 * 2, // -- 2分钟重新请求一次
	staleTime: 1000 * 60, // -- 1分钟内数据被认为是新鲜的，不会重新请求
	retry: 2, // -- 失败重试2次
	retryDelay: 1000, // -- 重试延迟1秒
}))

// -- 使用 atomEffect 处理版本更新
export const versionsEffectAtom = atomEffect((get, set) => {
	// -- 监听 versionQueryAtom 的变化
	const { data, isSuccess } = get(versionsQueryAtom)

	if (isSuccess && data) {
		// -- 更新版本信息
		set(versionsAtom, data)
	}
})

export const useLocalVersions = () => {
	const [{ isLoading, refetch }] = useAtom(versionsQueryAtom)

	return { refetchLocalVersions: refetch, isLoadingLocalVersions: isLoading }
}
