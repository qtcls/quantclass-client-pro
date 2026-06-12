/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { createHttpClient } from "@/shared/lib/http-client"

export {
	ApiError,
	appendQuery,
	type QueryParams,
} from "@/shared/lib/http-client"

const { VITE_BASE_URL } = import.meta.env
const { getAccessToken } = window.electronAPI

export const API_BASE = VITE_BASE_URL

type SessionInvalidHandler = () => void | Promise<void>
let sessionInvalidHandler: SessionInvalidHandler | null = null

export const setSessionInvalidHandler = (
	fn: SessionInvalidHandler | null,
): void => {
	sessionInvalidHandler = fn
}

const client = createHttpClient({
	baseUrl: API_BASE,
	getToken: () => getAccessToken(),
	onUnauthorized: () => sessionInvalidHandler?.(),
})

export const { get, post, put, httpDelete } = client
