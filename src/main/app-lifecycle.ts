/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { createWindow } from "@/main/lib/createWindow.js"
import {
	startTelemetryScheduler,
	stopTelemetryScheduler,
} from "@/main/lib/telemetry.js"
import store from "@/main/store/index.js"
import { cleanLockFiles } from "@/main/utils/tools.js"
import dayjs from "dayjs"
import { BrowserWindow, type Tray, app } from "electron"

export function setupAppLifecycle(tray: Tray) {
	store.setValue("app.start_time", dayjs().format("YYYY-MM-DD HH:mm:ss"))

	// 启动遥测定时检查
	startTelemetryScheduler()

	app.on("window-all-closed", async () => {
		stopTelemetryScheduler()
		if (process.platform !== "darwin") {
			app.quit()
		}
		await cleanLockFiles()
	})

	app.on("activate", async () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			await createWindow(tray)
		}
		await cleanLockFiles()
	})
}
