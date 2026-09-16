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
	exec,
	spawn,
} from "node:child_process"
import fs from "node:fs"
import store, { CONFIG_PATH, ROCKET_STR_INFO_PATH } from "@/main/store/index.js"
import { tokenStore } from "@/main/lib/tokenStore.js"
import { getKernalPath } from "@/main/utils/common.js"
import logger from "@/main/utils/wiston.js"
import { platform } from "@electron-toolkit/utils"
import Store from "electron-store"

const _store = new Store()

export interface FuelProbeResult {
	// -- -1 表示进程未启动成功（如二进制不存在、spawn 失败、超时被 kill）
	code: number
	stdout: string
	stderr: string
	timedOut: boolean
	durationMs: number
	// -- 当 code < 0 时，error 给出原因（如：内核不存在、spawn 失败、超时）
	error?: string
}

export interface RunFuelProbeOptions {
	// -- 子进程超时（ms），到点后 SIGKILL；省略时默认 10s
	timeoutMs?: number
}

// -- 探测型 fuel 子命令返回退出码
export async function runFuelProbe(
	args: string[],
	options: RunFuelProbeOptions = {},
): Promise<FuelProbeResult> {
	const timeoutMs = options.timeoutMs ?? 10_000
	const start = Date.now()

	const fuelBin = await getKernalPath("fuel")
	if (!fs.existsSync(fuelBin)) {
		return {
			code: -1,
			stdout: "",
			stderr: "",
			timedOut: false,
			durationMs: 0,
			error: "fuel 内核未安装",
		}
	}

	const fuelCodePath = await store.getAllDataPath(["code"])
	const fuelProTradingPath = await store.getAllDataPath(["real_trading"])
	const useOpenSell = _store.get(
		"real_market_config.use_open_sell",
		"0",
	) as string
	const accessToken = await tokenStore.getAccessToken()

	const env: NodeJS.ProcessEnv = {
		...process.env,
		FUEL_CODE_PATH: fuelCodePath,
		FUEL_CLIENT_CONFIG_PATH: CONFIG_PATH,
		FUEL_PRO_TRADING_PATH: fuelProTradingPath,
		PYTHONPATH: fuelCodePath,
		ROCKET_STR_INFO_PATH: ROCKET_STR_INFO_PATH,
		PYTHON8: "1",
		PYTHONUNBUFFERED: "1",
		PYTHONIOENCODING: "utf8",
		USE_OPEN_SELL: useOpenSell,
		FUEL_TEMP_FILE_PATH: "",
		FUEL_ACCESS_TOKEN: accessToken ?? "",
	}

	logger.info(
		`[fuel-probe] ~% fuel ${args.join(" ")}（timeout=${timeoutMs}ms）`,
	)

	return await new Promise<FuelProbeResult>((resolve) => {
		let child: ChildProcessWithoutNullStreams
		try {
			child = spawn(fuelBin, args, { env })
		} catch (e) {
			resolve({
				code: -1,
				stdout: "",
				stderr: "",
				timedOut: false,
				durationMs: Date.now() - start,
				error: `spawn 失败: ${(e as Error).message}`,
			})
			return
		}

		let stdout = ""
		let stderr = ""
		let timedOut = false

		const timer = setTimeout(() => {
			timedOut = true
			try {
				if (platform.isWindows) {
					exec(`taskkill /PID ${child.pid} /T /F`)
				} else {
					child.kill("SIGKILL")
				}
			} catch (e) {
				logger.warn(`[fuel-probe] 超时 kill 失败: ${(e as Error).message}`)
			}
		}, timeoutMs)

		child.stdout.on("data", (data: Buffer) => {
			stdout += data.toString("utf8")
		})
		child.stderr.on("data", (data: Buffer) => {
			stderr += data.toString("utf8")
		})

		child.on("error", (err) => {
			clearTimeout(timer)
			resolve({
				code: -1,
				stdout,
				stderr,
				timedOut,
				durationMs: Date.now() - start,
				error: `子进程错误: ${err.message}`,
			})
		})

		child.on("close", (code) => {
			clearTimeout(timer)
			const durationMs = Date.now() - start
			if (timedOut) {
				resolve({
					code: -1,
					stdout,
					stderr,
					timedOut: true,
					durationMs,
					error: `执行超时（>${timeoutMs}ms）`,
				})
				return
			}
			resolve({
				code: code ?? -1,
				stdout,
				stderr,
				timedOut: false,
				durationMs,
			})
		})
	})
}
