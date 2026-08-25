/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import fs from "node:fs/promises"
import store from "../store/index.js"
import { clearOldKernal, getKernalPath } from "../utils/common.js"
import logger from "../utils/wiston.js"
import { PACKAGE_INFO } from "../vars.js"

export async function getKernelVersion(kernal = "fuel") {
	try {
		// 获取code path
		const codePath = await store.getAllDataPath("code", true)
		// 读取该目录下的所有 .yml 文件
		const files = await fs.readdir(codePath)

		const ymlFiles = files.filter((file: string) => file.endsWith(".yml"))
		// 判断是否存在 yml 文件，且只有一个
		if (ymlFiles.length === 0) return "暂无内核"

		// 清理老的内核们
		await clearOldKernal(kernal)

		// 获取yml文件的文件名（假设只有一个 yml 文件）
		const ymlFile = ymlFiles.find((file: string) => file.startsWith(kernal))!
		try {
			await fs.access(await getKernalPath(kernal))
		} catch {
			logger.error(`[getKernelVersion]: ${kernal} 内核不存在`)
			await fs.unlink(ymlFile) // 删除yml文件
			return "暂无内核"
		}
		return ymlFile.replace(".yml", "")
	} catch (error) {
		return "暂无内核"
	}
}

/**
 * 检查本地的客户端版本，包括 Python Kernal 和客户端版本
 */
export async function getAppAndKernalVersions() {
	const defaultVersion = "暂无内核"
	try {
		const { version } = PACKAGE_INFO
		const fuelVersion = await getKernelVersion("fuel")
		const fusionVersion = await getKernelVersion("fusion")
		const rocketVersion = await getKernelVersion("rocket")
		const scmVersion = await getKernelVersion("scm")
		const clientVersion = version

		return {
			fuelVersion,
			clientVersion,
			fusionVersion,
			rocketVersion,
			scmVersion,
		}
	} catch (error) {
		const { version } = PACKAGE_INFO

		return {
			clientVersion: version,
			fuelVersion: defaultVersion,
			fusionVersion: defaultVersion,
			rocketVersion: defaultVersion,
			scmVersion: defaultVersion,
		}
	}
}
