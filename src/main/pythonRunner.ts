/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { type ChildProcess, spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import logger from "@/main/utils/wiston.js"
import { app } from "electron"

function getEmbeddedPythonPath(): string {
	const isWin = process.platform === "win32"
	const binPath = isWin ? "python.exe" : path.join("bin", "python3")

	if (app.isPackaged) {
		return path.join(process.resourcesPath, "python", binPath)
	}
	return path.join(process.cwd(), "resources", "python", process.arch, binPath)
}

function getParseScriptPath(): string {
	if (app.isPackaged) {
		return path.join(process.resourcesPath, "parse_config.py")
	}
	return path.join(process.cwd(), "resources", "parse_config.py")
}

/**
 * 调用内嵌 Python 解析 config.py 中的指定变量，返回 JSON 对象。
 *
 * @param configFilePath config.py 的绝对路径
 * @param varNames       要提取的变量名列表
 * @returns 变量名 → 值的映射（tuple 已转 list）
 */
export async function parsePythonConfig(
	configFilePath: string,
	varNames: string[],
): Promise<Record<string, any>> {
	const pythonBin = getEmbeddedPythonPath()
	const scriptPath = getParseScriptPath()

	if (!fs.existsSync(pythonBin)) {
		throw new Error(`内嵌 Python 不存在: ${pythonBin}`)
	}
	if (!fs.existsSync(scriptPath)) {
		throw new Error(`解析脚本不存在: ${scriptPath}`)
	}

	return new Promise((resolve, reject) => {
		const proc: ChildProcess = spawn(
			pythonBin,
			[scriptPath, configFilePath, ...varNames],
			{
				env: { ...process.env, PYTHONIOENCODING: "utf-8" },
				windowsHide: true,
			},
		)

		let stdout = ""
		let stderr = ""
		proc.stdout?.on("data", (data: Buffer) => {
			stdout += data.toString()
		})
		proc.stderr?.on("data", (data: Buffer) => {
			stderr += data.toString()
		})

		proc.on("error", (err) => {
			logger.error(`[pythonRunner] spawn 失败: ${err.message}`)
			reject(new Error(`启动内嵌 Python 失败: ${err.message}`))
		})

		proc.on("close", (code) => {
			if (code !== 0) {
				logger.error(`[pythonRunner] exit ${code}: ${stderr}`)
				reject(new Error(`Python 解析失败 (exit ${code}): ${stderr}`))
				return
			}
			try {
				resolve(JSON.parse(stdout))
			} catch {
				logger.error(`[pythonRunner] JSON 解析失败: ${stdout}`)
				reject(new Error(`Python 输出非法 JSON: ${stdout}`))
			}
		})
	})
}
