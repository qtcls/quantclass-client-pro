/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { useEffect } from "react"

const { getPendingRendererMigrations, markMigrationDone, rendererLog } =
	window.electronAPI

type RendererMigrationUp = () => void | Promise<void>

/**
 * 渲染层迁移注册表
 * key: 迁移 id（必须与 main 注册表中 target="renderer" 的迁移 id 一致）
 * value: 渲染层执行函数
 *
 * 以后新增渲染层迁移时：
 * 1. 在 main 的 migrations/index.ts 注册 { id, description, target: "renderer", up: () => {} }
 * 2. 在下面 rendererMigrations 里添加同 id 的处理函数
 */
const rendererMigrations: Record<string, RendererMigrationUp> = {}

export function useRendererMigrations() {
	useEffect(() => {
		const run = async () => {
			const pendingIds = await getPendingRendererMigrations()
			if (pendingIds.length === 0) return

			for (const id of pendingIds) {
				const up = rendererMigrations[id]
				if (!up) {
					rendererLog(
						"warning",
						`[renderer-migration] 未找到迁移处理函数: ${id}`,
					)
					continue
				}

				try {
					await up()
					await markMigrationDone(id, true)
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err)
					await markMigrationDone(id, false, message)
				}
			}
		}
		run()
	}, [])
}
