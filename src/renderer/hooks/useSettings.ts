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
import { useAtom, useSetAtom } from "jotai"
import { useCallback, useMemo } from "react"
import { settingsAtom } from "../store/electron"
import { libraryTypeAtom } from "../store/storage"

export function useSettings() {
	const [settings, setSettings] = useAtom(settingsAtom)
	const setLibraryTypeAtom = useSetAtom(libraryTypeAtom)
	const { getStoreValue } = window.electronAPI

	const updateSettings = useCallback(
		async (newSettings: Partial<SettingsType>) => {
			if (newSettings.libraryType) {
				setLibraryTypeAtom(newSettings.libraryType)
			}

			// 先从 config.json 读取settings的最新值，然后合并新的设置
			const latestSettings = await getStoreValue("settings")
			setSettings({
				...latestSettings,
				...newSettings,
			})
		},
		[setSettings, setLibraryTypeAtom, getStoreValue],
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

	const isFusionMode = useMemo(
		() => settings.libraryType === "pos",
		[settings.libraryType],
	)

	return {
		settings,
		setSettings,
		updateSettings,

		dataLocation,
		setDataLocation,

		performanceMode,
		setPerformanceMode,

		isFusionMode,
	}
}
