/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { cn } from "@/renderer/lib/utils"
import { type ReactNode, useCallback, useMemo } from "react"
import { useSearchParams } from "react-router"

export interface SectionTabItem<T extends string = string> {
	key: T
	label: string
}

interface SectionTabsProps<T extends string> {
	tabs: readonly SectionTabItem<T>[]
	value: T
	onValueChange: (value: T) => void
	className?: string
}

export function SectionTabs<T extends string>({
	tabs,
	value,
	onValueChange,
	className,
}: SectionTabsProps<T>) {
	return (
		<div className={cn("shrink-0 border-b bg-background", className)}>
			<div className="flex items-stretch gap-0.5 px-4">
				{tabs.map((tab) => {
					const active = value === tab.key
					return (
						<button
							key={tab.key}
							type="button"
							onClick={() => onValueChange(tab.key)}
							className={cn(
								"relative px-5 py-3.5 text-sm transition-colors duration-150 select-none outline-none",
								"border-b-2 -mb-px",
								active
									? "border-foreground bg-background text-foreground font-semibold"
									: "border-transparent text-muted-foreground/70 font-medium hover:bg-muted/50 hover:text-foreground",
							)}
						>
							{tab.label}
						</button>
					)
				})}
			</div>
		</div>
	)
}

interface SectionPageProps<T extends string> {
	tabs: readonly SectionTabItem<T>[]
	defaultTab: T
	children: (activeTab: T) => ReactNode
}

export function SectionPage<T extends string>({
	tabs,
	defaultTab,
	children,
}: SectionPageProps<T>) {
	const [searchParams, setSearchParams] = useSearchParams()
	const tabParam = searchParams.get("tab")

	const activeTab = useMemo(() => {
		if (tabParam && tabs.some((tab) => tab.key === tabParam)) {
			return tabParam as T
		}
		return defaultTab
	}, [tabParam, tabs, defaultTab])

	const handleTabChange = useCallback(
		(tab: T) => {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev)
					next.set("tab", tab)
					return next
				},
				{ replace: true },
			)
		},
		[setSearchParams],
	)

	return (
		<div className="flex flex-col h-full -mx-4">
			<SectionTabs
				tabs={tabs}
				value={activeTab}
				onValueChange={handleTabChange}
			/>
			<div className="flex-1 min-h-0 overflow-auto px-4 pt-4">
				{children(activeTab)}
			</div>
		</div>
	)
}
