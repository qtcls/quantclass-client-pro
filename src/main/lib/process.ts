/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import {
	type ChildProcessWithoutNullStreams,
	type SpawnOptionsWithoutStdio,
	exec,
	execSync,
	spawn,
} from "node:child_process"
import fs from "node:fs"
import { updateKernal } from "@/main/core/runpy.js"
import { userStore } from "@/main/lib/userStore.js"
import store, { CONFIG_PATH, ROCKET_STR_INFO_PATH } from "@/main/store/index.js"
import {
	isKernalRunning,
	isPidRunning,
	killKernalByForce,
} from "@/main/utils/tools.js"
import logger from "@/main/utils/wiston.js"
import { platform } from "@electron-toolkit/utils"
import dayjs from "dayjs"
import iconv from "iconv-lite"
import { isUndefined } from "lodash-es"
import { getKernalPath } from "../utils/common.js"
import windowManager from "./WindowManager.js"

export class ProcessManage {
	private processes: Map<
		number,
		{
			action: string
			createdAt: string
			pid?: number
			kernel: "fuel" | "rocket" | "aqua" | "zeus"
		}
	>

	constructor() {
		this.processes = new Map()
	}

	spawnProcess(
		command: string,
		args: string[],
		options: SpawnOptionsWithoutStdio,
		action: string,
		kernel: "fuel" | "rocket" | "aqua" | "zeus" = "fuel",
	) {
		const childProcess = spawn(command, args, options)
		const createdAt = dayjs().format("YYYY-MM-DD HH:mm")
		if (!childProcess.pid) {
			logger.error(`[${kernel}] 创建进程失败: pid失败`)
			return undefined
		}
		this.processes.set(childProcess.pid, {
			action,
			createdAt,
			pid: childProcess.pid,
			kernel,
		})

		// 监听进程结束事件，自动从存储中删除
		childProcess.on("exit", async (code, signal) => {
			logger.info(
				`[${kernel}] Process ${childProcess.pid} ${action} exited with code ${code} and signal ${signal}`,
			)
			try {
				const killCommand = (pid: string) =>
					platform.isWindows ? `taskkill /PID ${pid} /T /F` : `kill -9 ${pid}`

				if (isPidRunning(childProcess.pid!.toString())) {
					const output = execSync(killCommand(childProcess.pid!.toString()))
					// -- Windows 下对输出进行 GBK 解码
					const decodedOutput = platform.isWindows
						? iconv.decode(output, "gbk")
						: output.toString("utf-8")

					if (decodedOutput) {
						logger.info(`[proc] 进程终止输出: ${decodedOutput}`)
					}
				}
			} catch (e) {
				const error = e as Error & { stdout?: Buffer; stderr?: Buffer }
				// -- Windows 下对错误信息进行 GBK 解码
				const errorMessage =
					platform.isWindows && error.stderr
						? iconv.decode(error.stderr, "gbk")
						: error.message

				logger.info(
					`[${kernel}] 进程 ${childProcess.pid} 不存在，无需终止。${errorMessage}`,
				)
			} finally {
				// 删除临时文件夹
				this.processes.delete(childProcess.pid!)
				logger.info(
					`[${kernel}] 删除之后的processes:${JSON.stringify(this.processes)}`,
				)
			}
		})
		// console.log("44444")

		return childProcess
	}

	hasProcess(pid: number): boolean {
		return this.processes.has(pid)
	}

	async killProcess(pid: number): Promise<boolean> {
		logger.info(`传递进来的 PID: ${pid}`)
		const action = this.processes.get(pid)
		!isUndefined(action) &&
			logger.info(`终止进程 PID: ${JSON.stringify(action)}`)

		if (action) {
			try {
				// 根据操作系统执行相应的命令来结束进程
				if (platform.isWindows) {
					const is_running = process.kill(pid, 0)
					if (is_running) {
						exec(`taskkill /PID ${pid} /T /F`)
						logger.info(`进程 ${pid} 已被终止`)
					}
				} else {
					exec(`kill ${pid}`)
				}
			} catch (e) {
				// 忽略错误，因为进程可能已经不存在
				logger.error(`终止进程 ${pid} 时出错: ${e}`)
			}
			console.log("1111111")

			if (action.action === "自动更新所有数据") {
				await killKernalByForce("fuel")
			}
			if (action.kernel === "aqua") {
				await killKernalByForce("aqua")
			}
			if (action.kernel === "zeus") {
				await killKernalByForce("zeus")
			}
			if (action.action === "启动 rocket") {
				await killKernalByForce("rocket")
			}

			console.log("22222")

			// 检查对应 pid 是否还存在，不存在了再 delete
			if (!process.kill(pid, 0)) {
				this.processes.delete(pid)
				logger.info(`进程 PID ${pid} 已被终止`)
				return true
			}
			console.log("没有走if")
			logger.info(`进程 PID ${pid} 仍在运行`)
			return false
		}
		logger.info(`未找到 PID 为 ${pid} 的进程`)

		return false
	}

	getRunningProcesses() {
		return Array.from(this.processes.entries()).map(
			([pid, { action, createdAt, kernel }]) => ({
				pid,
				action,
				kernel: kernel,
				createdAt,
			}),
		)
	}

	hasProcessWithAction(action: string): boolean {
		return Array.from(this.processes.values()).some(
			(process) => process.action === action,
		)
	}
}

export const process_manager = new ProcessManage()

export const execBin = async (
	args: string[],
	action: string,
	kernel: "fuel" | "rocket" | "aqua" | "zeus" = "fuel",
	extraEnv?: string,
) => {
	try {
		const api_key = await store.getSetting("api_key", "")
		const hid = await store.getSetting("hid", "")
		const status = await store.getValue("status", 0)
		const userState = await userStore.getUserState()

		if (kernel !== "fuel") {
			const isAnonymous = (!api_key && !hid) || !userState?.isLoggedIn //--是否是游客
			const isAllowed = status !== 2 // --可以使用内核
			if (isAnonymous) {
				logger.warn(`[exec-${kernel}] 未登录，不调用内核`)
				return
			}
			if (isAllowed) {
				logger.warn(`[exec-${kernel}] 非分享会，不调用内核`)
				return
			}
		}

		if (!userState?.isLoggedIn) {
			logger.warn("[exec-fuel] 未登录，不调用内核")
			return
		}

		// -- 根据指定的内核选择相应的执行文件路径
		const binPath = await getKernalPath(kernel)
		const isKernalExist = fs.existsSync(binPath)

		if (!isKernalExist) {
			logger.warn(`[exec-${kernel}] 内核不存在，下载中`)
			try {
				await updateKernal(kernel)
			} catch (e) {
				logger.error(
					`[exec-${kernel}] 内核更新失败: ${JSON.stringify(e, null, 2)}`,
				)
			}
		}

		const fuelRunning = await isKernalRunning("fuel")
		const aquaRunning = await isKernalRunning("aqua")
		const zeusRunning = await isKernalRunning("zeus")
		const rocketRunning = await isKernalRunning("rocket", true)
		if (platform.isMacOS) exec(`chmod +x ${binPath}`)

		logger.info(`[exec-${kernel}] 内核路径: ${binPath}`)
		logger.info(
			`[exec-${kernel}] fuel(${fuelRunning})、rocket(${rocketRunning})、aqua(${aquaRunning})、zeus(${zeusRunning})`,
		)

		if (
			fuelRunning &&
			kernel === "fuel" &&
			process_manager.hasProcessWithAction("自动更新所有数据")
		) {
			logger.warn(`[exec-${kernel}] 仍在运行中，退出 execBin`)
			return
		}
		if (aquaRunning && kernel === "aqua") {
			logger.warn(`[exec-${kernel}] 仍在运行中，退出 execBin`)
			return
		}
		if (zeusRunning && kernel === "zeus") {
			logger.warn(`[exec-${kernel}] 仍在运行中，退出 execBin`)
			return
		}
		if (rocketRunning && kernel === "rocket" && args[0] !== "load") {
			logger.warn(`[exec-${kernel}] 仍在运行中，退出 execBin`)
			return
		}

		if (
			(kernel === "aqua" || kernel === "zeus") &&
			action === "选股" &&
			process_manager.hasProcessWithAction("选股")
		) {
			logger.warn(`[exec-${kernel}] 已存在选股的进程，跳过执行`)
			return
		}

		logger.info(`[exec-${kernel}] ${action} 开始执行...`)

		const fuelCodePath = await store.getAllDataPath(["code"])
		const fuelProTradingPath = await store.getAllDataPath(["real_trading"])
		logger.info(`export PYTHONPATH=${fuelCodePath}`)
		logger.info(`export FUEL_CODE_PATH=${fuelCodePath}`)
		logger.info(`export FUEL_CLIENT_CONFIG_PATH=${CONFIG_PATH}`)
		logger.info(`export FUEL_PRO_TRADING_PATH=${fuelProTradingPath}`)
		logger.info(`export ROCKET_STR_INFO_PATH=${ROCKET_STR_INFO_PATH}`)
		logger.info(`~% ${kernel} ${args.join(" ")}`)

		return new Promise((resolve, reject) => {
			// -- 内核目录
			process.env.FUEL_CODE_PATH = fuelCodePath
			// -- 客户端配置路径
			process.env.FUEL_CLIENT_CONFIG_PATH = CONFIG_PATH
			// -- 实盘 real_trading 路径
			process.env.FUEL_PRO_TRADING_PATH = fuelProTradingPath
			// -- 内核目录
			process.env.PYTHONPATH = fuelCodePath
			// -- 实盘 rocket 路径
			process.env.ROCKET_STR_INFO_PATH = ROCKET_STR_INFO_PATH
			process.env.PYTHON8 = "1"
			process.env.PYTHONUNBUFFERED = "1"
			process.env.PYTHONIOENCODING = "utf8"
			process.env.FUEL_TEMP_FILE_PATH = extraEnv ?? ""

			const pythonProcess = process_manager.spawnProcess(
				binPath,
				args,
				{
					env: process.env,
				},
				action,
				kernel,
			)
			if (pythonProcess) {
				handlePythonProcess(pythonProcess, resolve, reject, kernel, action)
			} else {
				logger.error(`[exec-${kernel}] 创建进程失败`)
			}
		})
	} catch (error) {
		logger.error(`[exec-${kernel}] 内核 ${action} 执行时发生错误: ${error}`)
		return
	}
}

function handlePythonProcess<T = any>(
	pythonProcess: ChildProcessWithoutNullStreams,
	resolve: (value?: T) => void,
	reject: (reason?: any) => void,
	kernel: "fuel" | "rocket" | "aqua" | "zeus",
	action: string,
) {
	const mainWindow = windowManager.getWindow()
	const terminalWindow = windowManager.getWindowById("terminal")
	const logType = kernel === "fuel" ? "fuel" : "realMarket"

	pythonProcess.stdout.on("data", (data: any) => {
		const utf8Data = `${data.toString("utf8")}`

		if (mainWindow?.webContents) {
			mainWindow.webContents.send("send-python-output", utf8Data, logType)
			if (terminalWindow) {
				terminalWindow?.webContents.send(
					"send-python-output",
					utf8Data,
					logType,
				)
			}
		} else {
			logger.error("主窗口或主窗口的 webContents 未定义")
		}
	})

	pythonProcess.stderr.on("data", (data: any) => {
		const utf8Data = `${data.toString("utf8")}`
		logger.error(`[${kernel}] ${action} 标准错误: ${utf8Data}`)

		reject?.(new Error(`${kernel} ${action} 错误: ${utf8Data}`))
	})

	pythonProcess.on("close", async (code: any) => {
		logger.info(`[${kernel}] ${action} 以代码 ${code} 退出`)

		if (code === 0) {
			resolve?.()
		} else {
			reject?.(new Error(`[${kernel}] ${action} 进程以代码 ${code} 退出`))
		}
	})
}
