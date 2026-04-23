/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { ApiError, get, post } from "@/renderer/utils/request"

const { rendererLog } = window.electronAPI

export const postUserAction = async (data: {
	role: string
	action: string
}) => {
	try {
		return await post("/api/data/data_client_record/create", data)
	} catch (error) {
		if (error instanceof ApiError) {
			rendererLog(
				"error",
				`请求失败 ${JSON.stringify(
					{
						status: error.status,
						error: error.data,
						requestData: data,
					},
					null,
					2,
				)}`,
			)
		} else {
			rendererLog(
				"error",
				`[postUserAction] 请求异常: ${JSON.stringify(error, null, 2)}`,
			)
		}
	}
}

export const getStatusExpires = async () => {
	try {
		return await get("/api/data/query/user/data_api/valid_to")
	} catch (error) {
		if (error instanceof ApiError) {
			rendererLog(
				"error",
				`[getStatusExpires] 请求失败 ${JSON.stringify(
					{
						status: error.status,
						error: error.data,
					},
					null,
					2,
				)}`,
			)
			return {
				code: 400,
				message:
					typeof error.data === "string"
						? error.data
						: JSON.stringify(error.data),
			}
		} else {
			rendererLog(
				"error",
				`[getStatusExpires] 请求异常: ${JSON.stringify(error, null, 2)}`,
			)
			return {
				code: 400,
				message: error instanceof Error ? error.message : String(error),
			}
		}
	}
}

export const getExtraWorkStatus = async () => {
	try {
		return await get("/api/data/query/user/elective_hw")
	} catch (error) {
		if (error instanceof ApiError) {
			rendererLog(
				"error",
				`[getExtraWorkStatus] 请求失败 ${JSON.stringify(
					{
						status: error.status,
						error: error.data,
					},
					null,
					2,
				)}`,
			)
		} else {
			rendererLog(
				"error",
				`[getExtraWorkStatus] 请求异常: ${JSON.stringify(error, null, 2)}`,
			)
		}
		return { data: false }
	}
}
