/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export interface ResearchVersionFile {
	id: string
	name: string
	description: string
	location: string
	code_enhancement?: string
	ct?: string
	ut?: string
	path?: string
	filenames?: string[]
	is_hidden?: boolean | null
	require_auth?: boolean | null
	extra_permissions?: string[]
}

export interface ResearchVersion {
	count?: number
	course?: Record<string, unknown>
	extra?: { threads?: unknown[] }
	file: ResearchVersionFile
	hidden: boolean
	link?: string
	remark?: string
	time: string
	title?: string
}

export interface ResearchItem {
	id: string
	category: string
	course_name: string
	description: string
	group: string
	order: number
	title: string
	versions: ResearchVersion[]
	white?: number
}

export interface ResearchListResponse {
	code: number
	data: ResearchItem[]
	message?: string
}

export interface ResearchTicketResponse {
	success: boolean
	ticket: string
	message?: string
}

export interface ResearchDownloadLinkResponse {
	code: number
	link: string
	message?: string
}
