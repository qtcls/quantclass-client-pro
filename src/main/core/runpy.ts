/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { execFile } from "node:child_process"
import fs from "node:fs"
import { writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import { promisify } from "node:util"
import { getKernelVersion } from "@/main/core/lib.js"
import windowManager from "@/main/lib/WindowManager.js"
import { tokenStore } from "@/main/lib/tokenStore.js"
import { postUserMainAction } from "@/main/request/index.js"
import store from "@/main/store/index.js"
import logger from "@/main/utils/wiston.js"
import { BASE_URL, CLIENT_VERSION } from "@/main/vars.js"
import type { AppVersions } from "@/shared/types/index.js"
import { platform } from "@electron-toolkit/utils"
import dayjs from "dayjs"
import {
	checkDownloadLimit,
	checkLock,
	createLockFile,
	removeLockFile,
} from "../utils/tools.js"

const require = createRequire(import.meta.url)
const AdmZip = require("adm-zip")
const execFileAsync = promisify(execFile)

const clientVersion = CLIENT_VERSION

const URL = `${BASE_URL}/api/data/query/client-versions`

// -- 添加工具函数
function getRandomDelay(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1) + min) * 1000
}

/**
 * 检查服务器内核版本，并且保存到本地
 * @returns {Promise<{version: string, download: string}>}
 * @throws Error
 */
export async function fetchRemoteVersions(): Promise<AppVersions> {
	console.log(`[version] fetch ${URL}?client=${clientVersion}`)
	const response = await fetch(`${URL}?client=${clientVersion}`)

	if (!response.ok)
		throw new Error(`[app] 内核版本获取失败: ${response.status}`)

	const resp = await response.json()

	store.setValue("app.versions", resp)
	return resp
}

/**
 * 获取本地缓存的远程版本，如果本地没有缓存，则重新请求远程版本
 * @returns {Promise<AppVersions>}
 */
export async function getRemoteVersions(): Promise<AppVersions> {
	const versions = (await store.getValue("app.versions", {})) as AppVersions
	if (!versions.latest) {
		try {
			return await fetchRemoteVersions()
		} catch (error) {
			logger.error(`[app] 获取远程版本失败: ${error}`)
			return versions
		}
	}
	return versions
}

/**
 * 检查本地版本和远程版本是否一致
 * @returns {Promise<boolean>} 如果版本一致返回 true,否则返回 false
 */
export async function checkRemoteVersions(now = true): Promise<AppVersions> {
	const current = dayjs()
	const lastUpdateCheck = await store.getValue("lastUpdateCheck.app", "")
	let remoteVersions = await getRemoteVersions()
	let needFetchRemoteVersion = true

	// 如果immediately=true，表示需要立即检查版本，这个时候跳过时间检查，直接请求远程版本
	if (lastUpdateCheck) {
		// -- 如果存在内核，且需要检查时间
		const lastUpdateTime = dayjs(lastUpdateCheck)
		const timeDifference = current.diff(lastUpdateTime, "second")
		const randomDelay = now ? 3 : (getRandomDelay(41, 67) * 7) / 1000 // 转换为秒，每次休息间隔大概7分钟再check版本
		logger.info(`随机数 ${randomDelay}，timeDifference ${timeDifference}`)
		if (timeDifference < randomDelay) {
			logger.info(
				`[远程版本检查] 距离上次检查时间不足 ${(randomDelay / 60).toFixed(1)} 分钟，跳过检查`,
			)
			needFetchRemoteVersion = false
		}
	}

	if (needFetchRemoteVersion) {
		try {
			remoteVersions = await fetchRemoteVersions()
		} catch (error) {
			logger.error(`[app] 获取远程版本失败: ${error}`)
			return remoteVersions
		}
	}
	store.setValue("lastUpdateCheck.app", current.toISOString())

	return remoteVersions
}

/**
 * 下载内核，从2025年5月27日开始，所有内核采用onedir的打包方式，所以需要替换exe为zip
 * @param kernal 内核名称
 * @returns
 */
export async function downloadKernal(
	kernal: "fuel" | "aqua" | "rocket" | "zeus",
	version: string,
	downloadUrl: string,
) {
	const lockFileName = `update_${kernal.toLowerCase()}.app.lock`
	if (await checkLock(lockFileName)) {
		logger.info(`[${kernal}] 正在下载中，退出`)
		return
	}

	logger.info(`[${kernal}] 更新开始...`)
	await createLockFile(lockFileName)
	const mainWindow = windowManager.getWindow()

	try {
		const codeFolder = await store.getAllDataPath(["code"])
		const kernalFolderPath = path.join(codeFolder, kernal)

		if (!downloadUrl) {
			logger.error(`[${kernal}] 下载链接为空`)
			return
		}

		logger.info(
			`[${kernal}] 版本: ${version}，使用远程链接: ${downloadUrl}，保存路径: ${codeFolder}`,
		)

		const fileName = downloadUrl.split("/").pop() as string
		const versionFileName = path.join(codeFolder, `${version}.yml`)
		const kernalZipPath = path.join(codeFolder, fileName)

		// -- 检查下载次数限制
		const canDownload = await checkDownloadLimit(kernal, 16)
		if (!canDownload) {
			logger.warn(`[${kernal}] 内核今日下载次数已达上限`)
			mainWindow?.webContents.send("report-msg", {
				code: 400,
				message: "今日内核下载次数已达上限，请联系助教再试",
			})
			return {
				success: false,
				error: "今日内核下载次数已达上限，请联系助教再试",
			}
		}

		// -- 开始下载
		const res = await fetch(downloadUrl)
		if (!res.ok) {
			logger.error(`[${kernal}] 获取内核失败: ${res.status}`)
			throw new Error(`获取 ${kernal} 内核失败: ${res.status}`)
		}

		const buffer = Buffer.from(await res.arrayBuffer())

		// await Promise.all([
		// 	writeFile(versionFileName, version),
		// 	writeFile(kernalZipPath, buffer),
		// ])

		// 下载内核文件
		await writeFile(kernalZipPath, buffer)
		logger.info(`[${kernal}] 内核文件已下载到 ${kernalZipPath}`)

		// 删除老内核文件夹
		try {
			if (fs.existsSync(kernalFolderPath)) {
				await fs.promises.rm(kernalFolderPath, { recursive: true, force: true })
			}
			logger.info(`[${kernal}] 删除原内核文件夹成功`)
		} catch {
			logger.error(`[${kernal}] 删除原内核文件时候报错`)
		}

		// 解压zip文件，从2025年5月27日开始，所有内核采用onedir的打包方式，所以需要解压zip文件
		if (platform.isMacOS) {
			await execFileAsync("unzip", ["-o", kernalZipPath, "-d", codeFolder])
		} else {
			const zip = new AdmZip(kernalZipPath)
			zip.extractAllTo(codeFolder, true)
		}
		await fs.promises.unlink(kernalZipPath) // 删除zip文件

		logger.info(`[${kernal}] 内核文件已解压到 ${codeFolder}`)

		// 更新版本信息文件，删除旧的版本文件
		try {
			// -- 删除对应内核的旧版本 yml 文件
			const prefix = kernal.toLowerCase()
			const oldVersionFiles = await fs.promises
				.readdir(codeFolder)
				.then((files) =>
					files.filter(
						(file) => file.startsWith(`${prefix}_`) && file.endsWith(".yml"),
					),
				)
			for (const file of oldVersionFiles) {
				await fs.promises.unlink(path.join(codeFolder, file))
				logger.info(`[${kernal}] 删除旧的内核版本文件: ${file}`)
			}

			// 更新版本信息文件
			await writeFile(versionFileName, version)
		} catch (error) {
			logger.error(`[${kernal}] 文件系统权限错误: ${error}`)
			mainWindow?.webContents.send("report-msg", {
				code: 400,
				message: `文件系统权限错误，内核下载失败: ${error}`,
			})
			return { success: false, error: "文件系统权限错误，内核下载失败" }
		}

		// -- 下载成功后发送埋点请求
		try {
			if (tokenStore.hasBothTokensInMemory()) {
				await postUserMainAction({
					role: "client",
					action: `下载 ${kernal} 内核成功: ${version}`,
				})
			}
		} catch (error) {
			logger.error(`[${kernal}] 请求点失败: ${error}`)
		}

		return { success: true, data: { version, downloadUrl } }
	} catch (error) {
		logger.error(`[${kernal}] 更新/下载内核失败: ${error}`)
		return { success: false, error: "更新/下载内核失败" }
	} finally {
		await removeLockFile(lockFileName)
	}
}

export async function updateKernal(
	kernal: "aqua" | "rocket" | "zeus" | "fuel",
	targetVersion?: string,
) {
	const winKernals = ["rocket"]
	// -- 如果需要立即检查版本，并且没有指定版本，则立即检查版本
	const remoteVersions = await checkRemoteVersions(!targetVersion)
	const localVersion = await getKernelVersion(kernal)

	let downloadVersion = ""

	// -- 非Windows系统，跳过更新
	if (!platform.isWindows && winKernals.includes(kernal)) {
		logger.info(`[${kernal}] 非Windows系统，跳过更新`)
		return { success: true, data: localVersion }
	}

	if (targetVersion) {
		if (localVersion === targetVersion) {
			logger.info(`[${kernal}] 版本一致，跳过更新`)
			return { success: true, data: localVersion }
		}
		downloadVersion = targetVersion
	} else {
		if (remoteVersions.latest[kernal] === localVersion) {
			logger.info(`[${kernal}] 与远程版本一致`)
			return { success: true, data: localVersion }
		}
		downloadVersion = remoteVersions.latest[kernal]
	}

	let downloadUrl = remoteVersions[kernal].find(
		(v) => v.version === downloadVersion,
	)?.download as string

	logger.info(`[${kernal}] ${downloadVersion} 下载地址: ${downloadUrl}`)

	// 如果是非Windows系统，在downloadUrl的文件名中加上-mac后缀
	if (!platform.isWindows) {
		downloadUrl = downloadUrl.replace(/(\.[^.]+)$/, "-mac$1")
		logger.info(`[${kernal}] 非Windows系统，下载地址调整为: ${downloadUrl}`)
	}
	return await downloadKernal(kernal, downloadVersion, downloadUrl)
}
