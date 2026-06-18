/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import fs from "node:fs"
import { writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import { repoStore } from "@/main/lib/repoStore.js"
import store, { CONFIG_PATH, ROCKET_STR_INFO_PATH } from "@/main/store/index.js"
import logger from "@/main/utils/wiston.js"
import { resolveRepoFolderNameFromLink } from "@/shared/lib/repo-folder.js"
import type {
	RepoApiType,
	RepoDeleteResult,
	RepoDownloadResult,
	WriteClientEnvResult,
} from "@/shared/types/repo.js"
import { app } from "electron"

const require = createRequire(import.meta.url)
const AdmZip = require("adm-zip")

const REPO_DIR_BY_API_TYPE: Record<RepoApiType, string> = {
	strategies: "strategy_repo",
	"basic-code": "framework_repo",
}

/** 按访达规则：基名不存在则用基名，否则依次尝试「基名 (1)」「基名 (2)」… */
function resolveAvailableVersionDirName(
	parentDir: string,
	baseName: string,
): string {
	if (!fs.existsSync(path.join(parentDir, baseName))) return baseName

	let n = 1
	while (fs.existsSync(path.join(parentDir, `${baseName} (${n})`))) {
		n += 1
	}
	return `${baseName} (${n})`
}

export interface DownloadAndExtractArgs {
	link: string
	apiType: RepoApiType
	versionName: string
	/** 覆盖已有同名文件夹；false 时按访达规则新建「基名 (1)」「基名 (2)」… */
	overwrite?: boolean
}

/**
 * 从下载链接拉取 zip，解压到 {repoDir}/{zipBaseName}/ 或 {zipBaseName} (n)/ 子目录，最后删除 zip。
 */
export async function downloadAndExtractRepo({
	link,
	apiType,
	versionName: _versionName,
	overwrite = false,
}: DownloadAndExtractArgs): Promise<RepoDownloadResult> {
	if (!link) {
		return { success: false, error: "下载链接为空" }
	}

	const repoDirName = REPO_DIR_BY_API_TYPE[apiType]
	if (!repoDirName) {
		return { success: false, error: `未知的 apiType: ${apiType}` }
	}

	let zipPath = ""
	try {
		const rawDataPath = await store.getSetting("all_data_path", "")
		if (!rawDataPath) {
			return { success: false, error: "请先在设置中配置数据存储路径" }
		}

		const extractDir = await store.getAllDataPath([repoDirName], true)
		if (!fs.existsSync(extractDir)) {
			await fs.promises.mkdir(extractDir, { recursive: true })
		}

		const baseDirName = resolveRepoFolderNameFromLink(link)
		if (!baseDirName) {
			return { success: false, error: "无法从下载链接解析目录名" }
		}
		const versionDirName = overwrite
			? baseDirName
			: resolveAvailableVersionDirName(extractDir, baseDirName)
		const versionExtractDir = path.join(extractDir, versionDirName)

		if (!fs.existsSync(versionExtractDir)) {
			await fs.promises.mkdir(versionExtractDir, { recursive: true })
		}

		zipPath = path.join(extractDir, `.download_${Date.now()}.zip`)

		logger.info(`[repo] 开始下载 ${apiType}: ${link}`)
		const res = await fetch(link)
		if (!res.ok) {
			logger.error(`[repo] 下载失败 ${apiType}: HTTP ${res.status}`)
			return { success: false, error: `下载失败: HTTP ${res.status}` }
		}

		const buffer = Buffer.from(await res.arrayBuffer())
		await writeFile(zipPath, buffer)
		logger.info(`[repo] zip 已保存到 ${zipPath}`)

		const zip = new AdmZip(zipPath)
		zip.extractAllTo(versionExtractDir, overwrite)
		logger.info(`[repo] 已解压到 ${versionExtractDir}`)

		await fs.promises.unlink(zipPath)
		zipPath = ""

		return {
			success: true,
			extractDir: versionExtractDir,
			folderName: versionDirName,
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		logger.error(`[repo] 下载/解压失败 ${apiType}: ${message}`)
		return { success: false, error: message }
	} finally {
		if (zipPath && fs.existsSync(zipPath)) {
			try {
				await fs.promises.unlink(zipPath)
			} catch (cleanupError) {
				logger.warn(
					`[repo] 清理临时 zip 失败 ${zipPath}: ${
						cleanupError instanceof Error
							? cleanupError.message
							: String(cleanupError)
					}`,
				)
			}
		}
	}
}

/** 在 framework_repo 根目录写入 client.env */
export async function writeFrameworkClientEnv(): Promise<WriteClientEnvResult> {
	try {
		const rawDataPath = await store.getSetting("all_data_path", "")
		if (!rawDataPath) {
			return { success: false, error: "请先在设置中配置数据存储路径" }
		}

		const frameworkRepoDir = await store.getAllDataPath(
			["framework_repo"],
			true,
		)
		if (!fs.existsSync(frameworkRepoDir)) {
			await fs.promises.mkdir(frameworkRepoDir, { recursive: true })
		}

		const fuelProTradingPath = await store.getAllDataPath(["real_trading"])
		const fuelCodePath = app.getPath("userData")
		const content = [
			`FUEL_CLIENT_CONFIG_PATH=${CONFIG_PATH}`,
			`FUEL_PRO_TRADING_PATH=${fuelProTradingPath}`,
			`ROCKET_STR_INFO_PATH=${ROCKET_STR_INFO_PATH}`,
			`FUEL_CODE_PATH=${fuelCodePath}`,
			"",
		].join("\n")

		const filePath = path.join(frameworkRepoDir, "client.env")
		await writeFile(filePath, content, "utf8")
		logger.info(`[repo] 已写入 client.env 到 ${filePath}`)

		return { success: true, filePath }
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		logger.error(`[repo] 写入 client.env 失败: ${message}`)
		return { success: false, error: message }
	}
}

/** 删除本地解压目录，并移除 repo_records 中对应记录 */
export async function deleteRepoDownload(
	ticket: string,
): Promise<RepoDeleteResult> {
	if (!ticket) {
		return { success: false, error: "记录标识为空" }
	}

	const record = repoStore.listRecords().find((r) => r.ticket === ticket)
	if (!record) {
		return { success: false, error: "记录不存在" }
	}

	try {
		if (record.extractDir && fs.existsSync(record.extractDir)) {
			await fs.promises.rm(record.extractDir, { recursive: true, force: true })
			logger.info(`[repo] 已删除本地目录 ${record.extractDir}`)
		}

		repoStore.deleteRecordByTicket(ticket)
		logger.info(`[repo] 已删除记录 ticket=${ticket}`)
		return { success: true }
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		logger.error(`[repo] 删除失败 ticket=${ticket}: ${message}`)
		return { success: false, error: message }
	}
}
