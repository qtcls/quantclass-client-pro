/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

// import { scan } from "react-scan"

import { ThemesProvider } from "@/renderer/components/providers"
import { ThemeWrapper } from "@/renderer/components/theme-wrapper"
import { Toaster as Sonner } from "@/renderer/components/ui/sonner"
import BaseErrorBoundary from "@/renderer/context/base-error-boundary"
import { createRoot } from "react-dom/client"
import App from "./app"
import "./worker"

import dayjs from "dayjs"
import "dayjs/locale/zh-cn"

import "./global.css"
import "./themes.css"

dayjs.locale("zh-cn")

const container = document.getElementById("app")!
const root = createRoot(container)

root.render(
	<ThemesProvider
		attribute="class"
		defaultTheme="system"
		enableSystem
		storageKey="ui-theme"
		// disableTransitionOnChange
	>
		<ThemeWrapper>
			<BaseErrorBoundary>
				<App />
				<Sonner position="top-center" visibleToasts={4} richColors />
			</BaseErrorBoundary>
		</ThemeWrapper>
	</ThemesProvider>,
)
