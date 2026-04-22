/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { UserAccountInfo } from "./user.js"

// -- access_token payload 结构
export interface AccessTokenJwtPayload {
	user?: UserAccountInfo
	exp?: number
}

// -- 主进程内存中的 access_token 结构
export interface AccessTokenStorage {
	access_token: string
	exp: number | null
}

// -- `POST /user/auth/refresh` 响应体
export interface AuthRefreshResponse {
	success: boolean
	access_token: string
	refresh_token?: string
}

// -- `POST /user/client/token` 响应体
export interface AuthClientTokenResponse {
	success: boolean
	access_token: string
	refresh_token: string
}
