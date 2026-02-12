/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import logger from "@/main/utils/wiston.js"
import { BASE_URL } from "@/main/vars.js"

export const postUserMainAction = async (
	api_key: string,
	data: {
		uuid: string
		role: string
		action: string
	},
) => {
	try {
		const response = await fetch(
			`${BASE_URL}/api/data/data_client_record/create`,
			{
				method: "POST",
				headers: {
					"api-key": api_key,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			},
		)

		if (!response.ok) {
			const errorText = await response.text()
			logger.error(`请求点失败-request: ${response.status} ${errorText}`)
		}

		return response
	} catch (error) {
		logger.error(`[postUserMainAction] 请求异常: ${error}`)
		throw error
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
