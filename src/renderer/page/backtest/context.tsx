/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { csvFileNameAtom } from "@/renderer/store"
import type { RunResultContextType } from "@/renderer/types/backtest"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAtomValue } from "jotai"
import type { ReactNode } from "react"
import { createContext, useContext, useState } from "react"

function createResultContext(mode: string | undefined) {
	const Context = createContext<RunResultContextType | undefined>(undefined)

	function Provider({ children }: { children: ReactNode }) {
		const queryClient = useQueryClient()
		const csvFileName = useAtomValue(csvFileNameAtom)
		const { parseCsvFile } = window.electronAPI
		const { data, refetch, isLoading, isPending } = useQuery({
			queryKey: [`load-${mode}-result`, csvFileName],
			queryFn: () => parseCsvFile(csvFileName, mode),
			enabled: false,
		})
		const [selectValue, setSelectValue] = useState<string | undefined>("1")

		return (
			<Context.Provider
				value={{
					refresh: refetch,
					loading: isLoading,
					isPending,
					data,
					selectValue,
					setSelectValue,
					resetData: () => {
						queryClient.removeQueries({
							queryKey: [`load-${mode}-result`],
						})
					},
				}}
			>
				{children}
			</Context.Provider>
		)
	}

	function useResult() {
		const context = useContext(Context)
		if (!context) {
			throw new Error(`useResult must be used within the ${mode}Provider`)
		}
		return context
	}

	return { Provider, useResult }
}

export const {
	Provider: BacktestResultProvider,
	useResult: useBacktestResult,
} = createResultContext("backtest")

export const { Provider: RealResultProvider, useResult: useRealResult } =
	createResultContext("trading")
