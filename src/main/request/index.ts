/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { ApiError, post } from "@/main/utils/request.js"
import logger from "@/main/utils/wiston.js"

export const postUserMainAction = async (data: {
	role: string
	action: string
}) => {
	try {
		return await post("/api/data/data_client_record/create", data)
	} catch (error) {
		if (error instanceof ApiError) {
			logger.error(
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
			logger.error(
				`[postUserMainAction] 请求异常: ${JSON.stringify(error, null, 2)}`,
			)
		}
	}
}

// 上报遥测到服务端 todo
export const postTelemetryReport = async (
	_apiKey: string,
	_hid: string,
	telemetryLog: string,
): Promise<void> => {
	logger.info(`[telemetry] 遥测上报（模拟）: ${telemetryLog}`)
}
