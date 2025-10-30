/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { TooltipProvider } from "@/renderer/components/ui/tooltip"
import { Provider as JotaiProvider } from "jotai"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

export function ThemesProvider({ children, ...props }: ThemeProviderProps) {
	return (
		<JotaiProvider>
			<NextThemesProvider {...props}>
				<TooltipProvider delayDuration={0}>{children}</TooltipProvider>
			</NextThemesProvider>
		</JotaiProvider>
	)
}
