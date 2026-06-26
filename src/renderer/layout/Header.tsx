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
	DATA_SECTION_PAGE,
	DATA_SECTION_ROUTE,
	DATA_TAB_NAME,
	HOME_PAGE,
	REAL_TRADING_SECTION_PAGE,
	REAL_TRADING_TAB_NAME,
	RESEARCH_SECTION_PAGE,
	RESEARCH_SECTION_ROUTE,
	RESEARCH_TAB_NAME,
	SETTINGS_PAGE,
	TRADING_SECTION_ROUTE,
} from "@/renderer/constant"
import { type HotkeyItem, useHotkeys } from "@/renderer/hooks/useHotkeys"
import { activeTabAtom } from "@/renderer/store"
import { useUpdateEffect } from "etc-hooks"
import { useSetAtom } from "jotai"
import { useLocation, useNavigate } from "react-router"

/**
 * Registers global hotkeys (Cmd/Ctrl+1..4 for nav, Cmd+, for settings)
 * and syncs activeTabAtom when the route changes.
 */
export function useNavHotkeysAndSync() {
	const { pathname } = useLocation()
	const navigate = useNavigate()
	const setActiveTab = useSetAtom(activeTabAtom)

	const hotKeys: HotkeyItem[] = [
		[
			"mod+1",
			() => {
				setActiveTab(HOME_PAGE)
				navigate(HOME_PAGE)
			},
		],
		[
			"mod+2",
			() => {
				setActiveTab(DATA_TAB_NAME)
				navigate(DATA_SECTION_ROUTE)
			},
		],
		[
			"mod+3",
			() => {
				setActiveTab(REAL_TRADING_TAB_NAME)
				navigate(TRADING_SECTION_ROUTE)
			},
		],
		[
			"mod+4",
			() => {
				setActiveTab(RESEARCH_TAB_NAME)
				navigate(RESEARCH_SECTION_ROUTE)
			},
		],
		["mod+,", () => navigate(SETTINGS_PAGE)],
	]

	useHotkeys(hotKeys)

	useUpdateEffect(() => {
		if (pathname === HOME_PAGE) {
			setActiveTab(HOME_PAGE)
		} else if (DATA_SECTION_PAGE.includes(pathname)) {
			setActiveTab(DATA_TAB_NAME)
		} else if (REAL_TRADING_SECTION_PAGE.includes(pathname)) {
			setActiveTab(REAL_TRADING_TAB_NAME)
		} else if (RESEARCH_SECTION_PAGE.includes(pathname)) {
			setActiveTab(RESEARCH_TAB_NAME)
		}
	}, [pathname])
}
