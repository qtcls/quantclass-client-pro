/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import fs from "node:fs/promises" // -- 使用 Promise API
import path from "node:path"
import { app } from "electron"
import * as winston from "winston"
import DailyRotateFile from "winston-daily-rotate-file"

const logDir = path.join(app.getPath("userData"), "logs")

// 如果不存在就创建
async function createLogDir() {
	// -- 创建异步函数
	if (!(await fs.stat(logDir).catch(() => false))) {
		// -- 检查目录是否存在
		await fs.mkdir(logDir) // -- 使用 Promise API 创建目录
	}
}

// -- 清理超过 7 天的日志文件
async function cleanOldLogs() {
	try {
		const files = await fs.readdir(logDir)
		const now = Date.now()
		const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

		for (const file of files) {
			if (file === "audit.json") continue // -- 跳过审计文件

			const filePath = path.join(logDir, file)
			const stats = await fs.stat(filePath)

			if (stats.mtimeMs < sevenDaysAgo) {
				await fs.unlink(filePath) // -- 删除超过 7 天的文件
				// logger.info(`已删除过期日志文件: ${file}`)
			}
		}
	} catch (error) {
		// logger.error(`清理日志文件失败: ${error}`)
	}
}

await createLogDir() // -- 调用异步函数
await cleanOldLogs() // -- 清理旧日志文件

const { combine, timestamp, printf } = winston.format

const myFormat = printf(
	({ level, message, timestamp }) =>
		`${timestamp} [${level.toUpperCase()}]: ${message}`,
)

const myFormatColor = winston.format.printf(({ level, message, timestamp }) => {
	let color = ""

	if (level === "error") {
		color = "\x1b[31m" // 红色
	} else if (level === "warn") {
		color = "\x1b[33m" // 黄色
	} else if (level === "info") {
		color = "\x1b[36m" // 青色
	}

	const levelStr = color ? `${color}${level}\x1b[0m` : level

	return `${timestamp} [${levelStr}]: ${message}`
})

const commonRotateConfig = {
	datePattern: "YYYY-MM-DD",
	zippedArchive: true,
	maxSize: "12m",
	maxFiles: "7d",
	auditFile: `${logDir}/audit.json`, // -- 添加审计文件配置
}

const logger = winston.createLogger({
	format: combine(
		timestamp({
			format: "YYYY-MM-DD HH:mm:ss",
		}),
		myFormat,
		printf(({ level, message, timestamp }) => {
			// -- 如果是对象，转换为格式化的 JSON 字符串
			const formattedMessage =
				typeof message === "object" ? JSON.stringify(message, null, 2) : message

			return `${timestamp} ${level}: ${formattedMessage}`
		}),
	),
	transports: [
		new DailyRotateFile({
			level: "error",
			filename: `${logDir}/%DATE%-error.log`,
			...commonRotateConfig,
		}),
		new DailyRotateFile({
			level: "warn",
			filename: `${logDir}/%DATE%-warn.log`,
			...commonRotateConfig,
		}),
		new DailyRotateFile({
			level: "info",
			filename: `${logDir}/%DATE%-info.log`,
			...commonRotateConfig,
		}),
		new winston.transports.Console({
			format: combine(
				timestamp({
					format: "YYYY-MM-DD HH:mm:ss",
				}),
				winston.format.colorize(),
				myFormatColor,
			),
		}),
	],
})

// -- 导出日志函数
export function log(type: string, message: string) {
	switch (type) {
		case "error":
			logger.error(message)
			break
		case "warning":
			logger.warn(message)
			break
		case "info":
			logger.info(message)
			break
		default:
			logger.info(message)
	}
}

export default logger
