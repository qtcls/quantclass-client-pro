/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { ROUTES } from "@/renderer/constant/route"
import Layout from "@/renderer/layout/Layout"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { Provider } from "jotai"
import { queryClientAtom } from "jotai-tanstack-query"
import { useHydrateAtoms } from "jotai/react/utils"
import type { FC } from "react"
import { HashRouter, Route, Routes } from "react-router"
import { CSSTransition, TransitionGroup } from "react-transition-group"

// 策略库的数据
// import { StrategiesProvider } from "@/renderer/context/strategies-context"
// 策略管理 Provider
import { StoreProvider } from "@/renderer/context/store-context"
// 客户端版本更新
import { UpdateProvider } from "@/renderer/context/update-context"
// HeroUI需要的Provider
import { HeroUIProvider } from "@heroui/system"
import { DevTools } from "jotai-devtools"
import "jotai-devtools/styles.css"
import RouteChangeListener from "./page/home/RouteChangeListener"

const { VITE_XBX_ENV } = import.meta.env

window.onerror = (message, source, lineno, colno, error) => {
	window.electronAPI.logHandle({ message, source, lineno, colno, error })
}

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: Number.POSITIVE_INFINITY,
		},
	},
})

const HydrateAtoms = ({ children }: any) => {
	useHydrateAtoms([[queryClientAtom, queryClient]])
	return children
}

const App: FC = () => {
	return (
		<QueryClientProvider client={queryClient}>
			<HeroUIProvider>
				<Provider>
					<HydrateAtoms>
						{/* <StrategiesProvider> */}
						<StoreProvider>
							<UpdateProvider>
								<TransitionGroup>
									<CSSTransition
										key={location.pathname}
										classNames="fade"
										timeout={250}
									>
										<HashRouter>
											<RouteChangeListener />
											<Routes>
												<Route path="/" element={<Layout />}>
													{ROUTES.map((menu) => (
														<Route
															key={menu.key}
															path={menu.key}
															element={<menu.element />}
														/>
													))}
												</Route>
											</Routes>
										</HashRouter>
									</CSSTransition>
								</TransitionGroup>
							</UpdateProvider>
						</StoreProvider>
						{/* </StrategiesProvider> */}
					</HydrateAtoms>
					{VITE_XBX_ENV === "development" && (
						<>
							<ReactQueryDevtools initialIsOpen={true} />
							<DevTools theme="dark" />
						</>
					)}
				</Provider>
			</HeroUIProvider>
		</QueryClientProvider>
	)
}

export default App
