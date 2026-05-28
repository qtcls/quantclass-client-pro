/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export function resolveVersionDirName(versionName: string): string {
	const trimmed = versionName.trim()
	if (!trimmed) return `repo_${Date.now()}`
	return trimmed.replace(/[/\\:*?"<>|]/g, "_")
}

export function isBaseFolderName(
	folderName: string,
	versionName: string,
): boolean {
	if (!folderName) return false
	return folderName === resolveVersionDirName(versionName)
}
