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
	broadcastAuthSessionInvalid,
	tokenStore,
} from "@/main/lib/tokenStore.js"
import { BASE_URL } from "@/main/vars.js"
import { createHttpClient } from "@/shared/lib/http-client.js"

export {
	ApiError,
	appendQuery,
	type QueryParams,
} from "@/shared/lib/http-client.js"

const client = createHttpClient({
	baseUrl: BASE_URL,
	getToken: () => tokenStore.getAccessToken(),
	onUnauthorized: broadcastAuthSessionInvalid,
})

export const { get, post, put, httpDelete } = client
