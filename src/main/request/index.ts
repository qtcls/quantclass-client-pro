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

export interface ClientTelemetryData {
	clientVersion: string
	fuelVersion: string
	fusionVersion: string
	rocketVersion: string
	lastLoginTime: string
	loginDuration: string
	machineId: string
}

export interface ClientTelemetryReportBody {
	key: string
	data: ClientTelemetryData
}

const CLIENT_TELEMETRY_CREATE_PATH = "/api/data/user-login/client-version/log"

export const postTelemetryReport = async (
	body: ClientTelemetryReportBody,
): Promise<void> => {
	try {
		await post(CLIENT_TELEMETRY_CREATE_PATH, body)
	} catch (error) {
		if (error instanceof ApiError) {
			logger.error(
				`[telemetry] 请求失败 ${JSON.stringify(
					{
						status: error.status,
						error: error.data,
						path: CLIENT_TELEMETRY_CREATE_PATH,
					},
					null,
					2,
				)}`,
			)
		} else {
			logger.error(
				`[postTelemetryReport] 请求异常: ${JSON.stringify(error, null, 2)}`,
			)
		}
		throw error
	}
}
