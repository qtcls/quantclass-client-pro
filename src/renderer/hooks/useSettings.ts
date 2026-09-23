/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { SettingsType } from "@/renderer/types"
import { useAtom } from "jotai"
import { useCallback } from "react"
import { settingsAtom } from "../store/electron"

export function useSettings() {
	const [settings, setSettings] = useAtom(settingsAtom)

	const updateSettings = useCallback(
		(newSettings: Partial<SettingsType>) => {
			setSettings((prev) => ({
				...prev,
				...newSettings,
			}))
		},
		[setSettings],
	)

	const dataLocation = settings.all_data_path || ""
	const setDataLocation = useCallback(
		(location: string) => updateSettings({ all_data_path: location }),
		[updateSettings],
	)

	const performanceMode = settings.performance_mode || "EQUAL"
	const setPerformanceMode = useCallback(
		(mode: string) => updateSettings({ performance_mode: mode }),
		[updateSettings],
	)

	return {
		settings,
		setSettings,
		updateSettings,
		dataLocation,
		setDataLocation,
		performanceMode,
		setPerformanceMode,
	}
}
