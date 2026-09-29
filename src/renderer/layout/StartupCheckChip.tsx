/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { StartupCheckConfigDialog } from "@/renderer/components/StartupCheckConfigDialog"
import { cn } from "@/renderer/lib/utils"
import { startupCheckEnabledAtom } from "@/renderer/store/startup-check"
import { useAtomValue } from "jotai"
import { useState } from "react"

type ChipStatus = "ok" | "idle"

const CHIP_DOT: Record<ChipStatus, string> = {
	ok: "bg-green-600 shadow-[0_0_0_3px_rgba(22,163,74,0.18)]",
	idle: "bg-muted-foreground/40",
}

const CHIP_TEXT: Record<ChipStatus, string> = {
	ok: "text-green-600",
	idle: "text-muted-foreground",
}

export function StartupCheckChip() {
	const enabled = useAtomValue(startupCheckEnabledAtom)
	const [configOpen, setConfigOpen] = useState(false)
	const chipStatus: ChipStatus = enabled ? "ok" : "idle"
	const statusLabel = enabled ? "已开启" : "未开启"

	return (
		<>
			<button
				type="button"
				onClick={() => setConfigOpen(true)}
				className={cn(
					"inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] cursor-pointer transition-colors hover:border-foreground/35 hover:text-foreground",
					CHIP_TEXT[chipStatus],
				)}
				aria-label={`自检 ${statusLabel}`}
			>
				<i
					className={cn(
						"w-2 h-2 rounded-full flex-shrink-0",
						CHIP_DOT[chipStatus],
					)}
				/>
				<span>自检</span>
				<span className="font-mono text-[10px] text-muted-foreground">
					{statusLabel}
				</span>
			</button>

			<StartupCheckConfigDialog open={configOpen} onOpenChange={setConfigOpen} />
		</>
	)
}
