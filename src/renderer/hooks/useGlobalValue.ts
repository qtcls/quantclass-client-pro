/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { isUpdatingAtom } from "@/renderer/store"
import { whiteListQueryAtom } from "@/renderer/store/whitelist"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect } from "react"

const { sendUpdateStatus } = window.electronAPI

export const useGlobalValue = () => {
	const setIsUpdating = useSetAtom(isUpdatingAtom)

	useAtomValue(whiteListQueryAtom)

	useEffect(() => {
		const handlerUpdateStatus = (_event: any, data: boolean) => {
			setIsUpdating(data)
		}

		const unsubscribe = sendUpdateStatus(handlerUpdateStatus)

		return unsubscribe
	}, [])
}
