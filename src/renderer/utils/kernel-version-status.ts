/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { KernalVersionType } from "@/shared/types"

export type KernelVersionUpdateLevel = "ok" | "optional" | "required"

function isKernelVersionObsolete(
	currentVersion: string | undefined,
	versionList: KernalVersionType[],
): boolean {
	return (
		versionList.some(
			(v) => v.version === currentVersion && v.label === "pulled",
		) ||
		currentVersion === "暂无内核" ||
		!versionList.some((v) => v.version === currentVersion)
	)
}

export function getKernelVersionUpdateLevel(
	currentVersion: string | undefined,
	latestVersion: string | undefined,
	versionList: KernalVersionType[],
): KernelVersionUpdateLevel {
	if (isKernelVersionObsolete(currentVersion, versionList)) {
		return "required"
	}
	if (currentVersion !== latestVersion) {
		return "optional"
	}
	return "ok"
}
