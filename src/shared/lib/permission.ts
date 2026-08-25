/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export type PermissionCondition =
	| string
	| string[]
	| { conditions: string[]; method: "OR" | "AND" }

/**
 * 权限检查（OR 逻辑）
 * 参数之间是 OR 关系，数组内部是 AND 关系（可通过对象参数的 method 修改）
 */
export function checkPermission(
	permissions: string[],
	...conditions: PermissionCondition[]
): boolean {
	return conditions.some((condition) => matchPermission(permissions, condition))
}

/**
 * 权限检查（AND 逻辑）
 * 参数之间是 AND 关系，数组内部是 AND 关系（可通过对象参数的 method 修改）
 */
export function checkAllPermissions(
	permissions: string[],
	...conditions: PermissionCondition[]
): boolean {
	return conditions.every((condition) =>
		matchPermission(permissions, condition),
	)
}

function matchPermission(
	permissions: string[],
	condition: PermissionCondition,
): boolean {
	if (typeof condition === "string") {
		return permissions.includes(condition)
	}

	if (Array.isArray(condition)) {
		return condition.every((c) => permissions.includes(c))
	}

	if (typeof condition === "object" && "conditions" in condition) {
		if (condition.method === "AND") {
			return condition.conditions.every((c) => permissions.includes(c))
		}
		return condition.conditions.some((c) => permissions.includes(c))
	}

	return false
}

export function getSelectKernal(permissions: string[]): "fusion" | "aqua" {
	return checkPermission(permissions, "isMember") ? "fusion" : "aqua"
}
