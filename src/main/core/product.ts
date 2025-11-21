/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { readFile, writeFile } from "node:fs/promises"
// import { checkFuelExist } from "@/main/core/runpy.js"
import { execBin } from "@/main/lib/process.js"
import store from "@/main/store/index.js"
import { isKernalBusy } from "@/main/utils/tools.js"
import logger from "@/main/utils/wiston.js"

// 增量更新和定时增量更新
export async function updateProduct(product?: string) {
	try {
		logger.info(
			`check fuel_bin exist before update ${product ? "one_data" : "all_data"}`,
		)
		// await checkFuelExist()

		const isFuelBusy = await isKernalBusy("fuel")

		logger.info(`manually update ${product}`)
		!isFuelBusy && product
			? await execBin(["one_data", product], `增量更新-${product}`)
			: await execBin(["all_data"], "全部数据增量更新")

		return {
			status: "success",
			message: `执行 ${product ?? "全部"} 数据增量更新`,
		}
	} catch (error) {
		logger.error(error)
		return
	}
}

// 全量历史数据
export async function updateFullProducts(
	product_name: string,
	full_data_name?: string,
) {
	try {
		logger.info(`check fuel_bin exist before update ${product_name} full data`)

		const isFuelBusy = await isKernalBusy("fuel")

		logger.info("manually update full products")

		!isFuelBusy && !full_data_name
			? await execBin(["full_data", product_name], "全量历史数据")
			: await execBin(
					["full_data_link", product_name, full_data_name!],
					"全量历史数据接口校验",
				)

		return {
			status: "success",
			message: `执行 ${product_name} 产品历史全量数据`,
		}
	} catch (error) {
		logger.error(`update full products error: ${error}`)
		return
	}
}

export async function downloadFullData(product_name: string) {
	try {
		const file_path = await store.getAllDataPath([
			"code",
			"data",
			"products-status.json",
		])
		const data_buffer = await readFile(file_path, "utf-8")
		const json = JSON.parse(data_buffer)
		const full_data_download_url = json[product_name]?.fullDataDownloadUrl
		const zip_name = full_data_download_url.match(/([^/]+\.zip)/)?.[0]
		const zip_dir_path = await store.getAllDataPath(["zip", zip_name])

		const res = await fetch(full_data_download_url) // 确保使用正确的 URL 变量

		if (!res.ok) {
			logger.error(
				`fetching full_data_download_url URL: ${full_data_download_url}, status: ${res.status}`,
			)

			throw new Error(`fetching URL: ${res.statusText}`)
		}

		const arrayBuffer = await res.arrayBuffer()
		const buffer = Buffer.from(arrayBuffer)

		await writeFile(zip_dir_path, buffer)
		logger.info(`full data zip 下载完成: ${zip_dir_path}`)
	} catch (error) {
		logger.error(`download full data error: ${error}`)
	}
}
