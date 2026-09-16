/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { createWriteStream } from "node:fs"
import { readFile } from "node:fs/promises"
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

export async function downloadFullData(
	product_name: string,
	onProgress?: (progress: {
		transferred: number
		total: number
		percent: number
		bytesPerSecond: number
	}) => void,
) {
	let downloadedBytes = 0
	const startTime = Date.now()
	let lastUpdateTime = startTime
	let lastDownloadedBytes = 0

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

		// 获取文件总大小（如果响应头中包含 Content-Length）
		const totalBytes = res.headers.get("content-length")
			? Number.parseInt(res.headers.get("content-length")!, 10)
			: null

		// 使用流式下载避免大文件内存溢出
		if (!res.body) {
			throw new Error("响应体不可用")
		}

		const writeStream = createWriteStream(zip_dir_path)
		const reader = res.body.getReader()

		try {
			// 处理写入流完成和错误
			const writePromise = new Promise<void>((resolve, reject) => {
				writeStream.on("finish", resolve)
				writeStream.on("error", reject)
			})

			// 流式读取并写入，处理背压
			while (true) {
				const { done, value } = await reader.read()
				if (done) {
					writeStream.end()
					break
				}

				// 更新下载字节数
				downloadedBytes += value.length
				const now = Date.now()

				// 每 200ms 更新一次进度（避免过于频繁的更新）
				if (onProgress && now - lastUpdateTime >= 200) {
					const timeElapsed = (now - lastUpdateTime) / 1000 // 秒
					const bytesPerSecond =
						timeElapsed > 0
							? (downloadedBytes - lastDownloadedBytes) / timeElapsed
							: 0
					const percent =
						totalBytes !== null
							? Math.min(100, (downloadedBytes / totalBytes) * 100)
							: 0

					onProgress({
						transferred: downloadedBytes,
						total: totalBytes ?? 0,
						percent,
						bytesPerSecond,
					})

					lastUpdateTime = now
					lastDownloadedBytes = downloadedBytes
				}

				// 写入数据块，如果缓冲区满则等待 drain 事件
				const drained = writeStream.write(value)
				if (!drained) {
					await new Promise((resolve) => writeStream.once("drain", resolve))
				}
			}

			// 发送最终进度（100%）
			if (onProgress && totalBytes !== null) {
				onProgress({
					transferred: downloadedBytes,
					total: totalBytes,
					percent: 100,
					bytesPerSecond: 0,
				})
			}

			// 等待写入流完成
			await writePromise
		} finally {
			reader.releaseLock()
		}

		logger.info(`full data zip 下载完成: ${zip_dir_path}`)
	} catch (error) {
		logger.error(`download full data error: ${error}`)
		throw error
	}
}
