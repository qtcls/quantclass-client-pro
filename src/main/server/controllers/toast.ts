/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import windowManager from "@/main/lib/WindowManager.js"
import logger from "@/main/utils/wiston.js"
import { IPC_CHANNELS } from "@/shared/ipc-channels.js"
import type { Context } from "hono"
import type { IRes } from "../types/index.js"

export async function reportToast(c: Context) {
	const body: IRes & { msgType: "info" | "success" | "warning" | "error" } =
		await c.req.json()
	logger.warn("toast", JSON.stringify(body))

	const mainWindow = windowManager.getWindow()
	mainWindow?.webContents.send(IPC_CHANNELS.REPORT_MSG, body)

	return c.json({ ...body })
}
