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
import { execBin } from "@/main/lib/process.js"
import { repoStore } from "@/main/lib/repoStore.js"
import store, { CONFIG_PATH, ROCKET_STR_INFO_PATH } from "@/main/store/index.js"
import logger from "@/main/utils/wiston.js"
import { resolveRepoFolderNameFromLink } from "@/shared/lib/repo-folder.js"
import type {
	LaunchConfigMasterResult,
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

function resolveAvailableZipBaseName(
	parentDir: string,
	baseName: string,
): string {
	if (!fs.existsSync(path.join(parentDir, `${baseName}.zip`))) return baseName

	let n = 1
	while (fs.existsSync(path.join(parentDir, `${baseName} (${n}).zip`))) {
		n += 1
	}
	return `${baseName} (${n})`
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function isStrategyExtractedFolderName(
	folderName: string,
	entryName: string,
): boolean {
	if (entryName === folderName) return true
	const pattern = new RegExp(
		`^${escapeRegExp(folderName)}(?: \\d+| \\(\\d+\\))$`,
	)
	return pattern.test(entryName)
}

async function removeStrategyExtractedFolders(
	parentDir: string,
	folderName: string,
	excludePath?: string,
): Promise<void> {
	const entries = await fs.promises.readdir(parentDir, { withFileTypes: true })
	for (const entry of entries) {
		if (!entry.isDirectory()) continue
		if (!isStrategyExtractedFolderName(folderName, entry.name)) continue

		const targetPath = path.join(parentDir, entry.name)
		if (excludePath && path.resolve(targetPath) === path.resolve(excludePath)) {
			continue
		}
		if (!fs.existsSync(targetPath)) continue

		await fs.promises.rm(targetPath, { recursive: true, force: true })
		logger.info(`[repo] 已删除精心随机解压目录 ${targetPath}`)
	}
}

export interface DownloadAndExtractArgs {
	link: string
	apiType: RepoApiType
	versionName: string
	/** 覆盖已有同名文件夹；false 时按访达规则新建「基名 (1)」「基名 (2)」… */
	overwrite?: boolean
}

/**
 * 从下载链接拉取 zip。
 * - strategies（精心随机）：保存为 {repoDir}/{name}.zip，不解压
 * - basic-code（框架源码）：解压到 {repoDir}/{name}/ 子目录，删除 zip
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

	let tempZipPath = ""
	try {
		const rawDataPath = await store.getSetting("all_data_path", "")
		if (!rawDataPath) {
			return { success: false, error: "请先在设置中配置数据存储路径" }
		}

		const repoDir = await store.getAllDataPath([repoDirName], true)
		if (!fs.existsSync(repoDir)) {
			await fs.promises.mkdir(repoDir, { recursive: true })
		}

		const baseDirName = resolveRepoFolderNameFromLink(link)
		if (!baseDirName) {
			return { success: false, error: "无法从下载链接解析目录名" }
		}

		logger.info(`[repo] 开始下载 ${apiType}: ${link}`)
		const res = await fetch(link)
		if (!res.ok) {
			logger.error(`[repo] 下载失败 ${apiType}: HTTP ${res.status}`)
			return { success: false, error: `下载失败: HTTP ${res.status}` }
		}

		const buffer = Buffer.from(await res.arrayBuffer())

		if (apiType === "strategies") {
			const versionDirName = overwrite
				? baseDirName
				: resolveAvailableZipBaseName(repoDir, baseDirName)
			const savedZipPath = path.join(repoDir, `${versionDirName}.zip`)

			await writeFile(savedZipPath, buffer)
			logger.info(`[repo] 精心随机策略 zip 已保存到 ${savedZipPath}`)

			return {
				success: true,
				extractDir: savedZipPath,
				folderName: versionDirName,
			}
		}

		const versionDirName = overwrite
			? baseDirName
			: resolveAvailableVersionDirName(repoDir, baseDirName)
		const versionExtractDir = path.join(repoDir, versionDirName)

		if (!fs.existsSync(versionExtractDir)) {
			await fs.promises.mkdir(versionExtractDir, { recursive: true })
		}

		tempZipPath = path.join(repoDir, `.download_${Date.now()}.zip`)

		await writeFile(tempZipPath, buffer)
		logger.info(`[repo] zip 已保存到 ${tempZipPath}`)

		const zip = new AdmZip(tempZipPath)
		zip.extractAllTo(versionExtractDir, overwrite)
		logger.info(`[repo] 已解压到 ${versionExtractDir}`)

		await fs.promises.unlink(tempZipPath)
		tempZipPath = ""

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
		if (tempZipPath && fs.existsSync(tempZipPath)) {
			try {
				await fs.promises.unlink(tempZipPath)
			} catch (cleanupError) {
				logger.warn(
					`[repo] 清理临时 zip 失败 ${tempZipPath}: ${
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
			const stat = await fs.promises.stat(record.extractDir)
			if (stat.isDirectory()) {
				await fs.promises.rm(record.extractDir, {
					recursive: true,
					force: true,
				})
				logger.info(`[repo] 已删除本地目录 ${record.extractDir}`)
			} else {
				await fs.promises.unlink(record.extractDir)
				logger.info(`[repo] 已删除本地文件 ${record.extractDir}`)
			}
		}

		if (
			record.apiType === "strategies" &&
			record.folderName &&
			record.extractDir
		) {
			await removeStrategyExtractedFolders(
				path.dirname(record.extractDir),
				record.folderName,
				record.extractDir,
			)
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

export interface LaunchConfigMasterArgs {
	backtestRoot: string
}

const CONFIG_MASTER_URL = "http://127.0.0.1:9999"

export async function launchConfigMaster({
	backtestRoot,
}: LaunchConfigMasterArgs): Promise<LaunchConfigMasterResult> {
	try {
		if (!backtestRoot || !fs.existsSync(backtestRoot)) {
			return { success: false, error: "框架源码目录不存在" }
		}

		const dataCenterPath = await store.getSetting("all_data_path", "")
		if (!dataCenterPath) {
			return { success: false, error: "请先在设置中配置数据存储路径" }
		}

		await execBin([], "启动 config 大师", "scm", {
			CONFIG_MASTER_BACKTEST_ROOT: backtestRoot,
			FUEL_DATA_CENTER_PATH: dataCenterPath,
		})

		logger.info(
			`[config-master] 已启动 CONFIG_MASTER_BACKTEST_ROOT=${backtestRoot}, FUEL_DATA_CENTER_PATH=${dataCenterPath}`,
		)
		return { success: true, url: CONFIG_MASTER_URL }
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		logger.error(`[config-master] 启动失败: ${message}`)
		return { success: false, error: message }
	}
}
