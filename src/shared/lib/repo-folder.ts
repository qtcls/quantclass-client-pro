/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

// 从下载链接中的zip名解析目录名
export function resolveRepoFolderNameFromLink(link: string): string | null {
	try {
		const zipName = new URL(link).pathname.split("/").pop()
		if (!zipName?.endsWith(".zip")) return null
		let base = zipName.slice(0, -4)
		const match = base.match(/^[a-f0-9]+_(.+)$/i)
		if (match) base = match[1]
		return base.replace(/[/\\:*?"<>|]/g, "_")
	} catch {
		return null
	}
}

export function isBaseFolderName(folderName: string, link?: string): boolean {
	if (!folderName || !link) return false
	const expected = resolveRepoFolderNameFromLink(link)
	if (!expected) return false
	return folderName === expected
}
