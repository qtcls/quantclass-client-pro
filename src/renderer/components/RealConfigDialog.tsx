/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { RebTimeConfigContent } from "@/renderer/components/RebTimeConfigModal"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/renderer/components/ui/tabs"
import { TradingConfigForm } from "@/renderer/page/trading/config-form"
import { realConfigEditModalAtom } from "@/renderer/store"
import { useAtom } from "jotai"
import { Clock, Monitor, Settings, TvMinimalPlay } from "lucide-react"
import { useState } from "react"

export function RealConfigDialog() {
	const [open, setOpen] = useAtom(realConfigEditModalAtom)
	const [tab, setTab] = useState("config")

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen)
				if (!nextOpen) setTab("config")
			}}
		>
			<DialogContent className="p-4 max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center">
						<TvMinimalPlay className="mr-2" size={22} />
						<span>实盘配置</span>
					</DialogTitle>
				</DialogHeader>
				<Tabs value={tab} onValueChange={setTab} className="w-full">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="config" className="gap-1">
							<Settings className="size-4" />
							实盘配置
						</TabsTrigger>
						<TabsTrigger value="qmt" className="gap-1">
							<Monitor className="size-4" />
							QMT配置
						</TabsTrigger>
						<TabsTrigger value="rebtime" className="gap-1">
							<Clock className="size-4" />
							换仓时间配置
						</TabsTrigger>
					</TabsList>
					<TradingConfigForm onGoToQmt={() => setTab("qmt")} />
					<TabsContent value="rebtime" className="mt-4">
						<RebTimeConfigContent />
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	)
}
