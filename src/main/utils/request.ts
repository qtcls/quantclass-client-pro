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

// -- 统一请求封装（非 2xx 抛 ApiError，含 status + data）
export class ApiError extends Error {
	status: number
	data: unknown

	constructor(message: string, status: number, data: unknown) {
		super(message)
		this.name = "ApiError"
		this.status = status
		this.data = data
	}
}

export type QueryParams = Record<
	string,
	string | number | boolean | null | undefined
>

// 把 params 拼接到 path 后面
export const appendQuery = (path: string, params?: QueryParams): string => {
	if (!params) return path
	const query = Object.entries(params)
		.filter(([, v]) => v !== undefined && v !== null)
		.map(
			([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
		)
		.join("&")
	if (!query) return path
	const sep = path.includes("?") ? "&" : "?"
	return `${path}${sep}${query}`
}

const buildUrl = (path: string): string => {
	if (/^https?:\/\//i.test(path)) return path
	return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

const buildHeaders = (input?: HeadersInit, token?: string | null): Headers => {
	const headers = new Headers(input)
	if (!headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json")
	}
	if (token) {
		headers.set("Authorization", `Bearer ${token}`)
	}
	return headers
}

const serializeBody = (
	body: unknown,
	headers: Headers,
): BodyInit | undefined => {
	if (body === undefined || body === null) return undefined
	if (
		typeof body === "string" ||
		body instanceof URLSearchParams ||
		body instanceof ArrayBuffer ||
		body instanceof Uint8Array
	) {
		if (
			!(typeof body === "string") &&
			headers.get("Content-Type") === "application/json"
		) {
			headers.delete("Content-Type")
		}
		return body as BodyInit
	}
	return JSON.stringify(body)
}

const parseSuccessBody = async <T>(res: Response): Promise<T> => {
	const contentType = res.headers.get("Content-Type") ?? ""
	if (!contentType.includes("application/json")) {
		const text = await res.text()
		return (text ? text : undefined) as T
	}
	return (await res.json()) as T
}

const parseErrorBody = async (res: Response): Promise<unknown> => {
	try {
		const contentType = res.headers.get("Content-Type") ?? ""
		if (contentType.includes("application/json")) {
			return await res.json()
		}
		const text = await res.text()
		return text || null
	} catch {
		return null
	}
}

const request = async <T = any>(
	method: string,
	path: string,
	body?: unknown,
): Promise<T> => {
	const url = buildUrl(path)
	const token = await tokenStore.getAccessToken()
	const headers = buildHeaders(undefined, token)
	const serialized = serializeBody(body, headers)
	const res = await fetch(url, { method, headers, body: serialized })

	if (!res.ok) {
		const errBody = await parseErrorBody(res)
		if (res.status === 401) {
			broadcastAuthSessionInvalid()
		}
		throw new ApiError(
			`Request failed: ${res.status} ${res.statusText}`,
			res.status,
			errBody,
		)
	}

	return parseSuccessBody<T>(res)
}

const createBodyRequest =
	(method: string) =>
	<T = any>(path: string, body?: unknown): Promise<T> =>
		request<T>(method, path, body)

export const get = <T = any>(path: string, params?: QueryParams): Promise<T> =>
	request<T>("GET", appendQuery(path, params))

export const post = createBodyRequest("POST")
export const put = createBodyRequest("PUT")
export const httpDelete = createBodyRequest("DELETE")
