/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { autoInitAtoms } from "@/renderer/store/electron"
import { useElectronStoreInit } from "@/renderer/utils/store"

export function ElectronStoreInitProvider({
	children,
}: {
	children: React.ReactNode
}) {
	for (const _atom of autoInitAtoms) {
		useElectronStoreInit(_atom as never)
	}

	return children
}
