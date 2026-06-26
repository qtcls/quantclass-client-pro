/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { useAlertDialog } from "@/renderer/context/alert-dialog"
import ButtonTooltip from "@/renderer/components/ui/button-tooltip"
import { DataCard } from "@/renderer/page/home/data-card"
import { OverviewDateBadge } from "@/renderer/page/home/overview-date-badge"
import { OverviewMetrics } from "@/renderer/page/home/overview-metrics"
import { ResearchCard } from "@/renderer/page/home/research-card"
import { TradingCard } from "@/renderer/page/home/trading-card"
import { loadAccountQueryAtom } from "@/renderer/store/query"
import { useAtom } from "jotai"
import { Eye, EyeOff, RefreshCw } from "lucide-react"
import { type FC, useEffect, useState } from "react"
import { ABOUT_CLIENT_VER, AboutPage } from "../settings/about"

const { getStoreValue, setStoreValue, closeApp } = window.electronAPI

const Home: FC = () => {
	const useAlert = useAlertDialog()
	const [showFinanceInfo, setShowFinanceInfo] = useState(true)
	const [{ isFetching: isRefreshingAccount, refetch: refetchAccount }] =
		useAtom(loadAccountQueryAtom)

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-shot on mount
	useEffect(() => {
		const aboutKey = `app.alert.${ABOUT_CLIENT_VER}`
		getStoreValue(aboutKey, "").then((value) => {
			if (value === "") {
				useAlert.open({
					title: "关于客户端及使用逻辑",
					content: <AboutPage />,
					okText: "我已充分了解",
					isContentLong: true,
					disableClose: true,
					onOk: () => {
						setStoreValue(aboutKey, `${Date.now()}`)
					},
					onCancel: () => {
						closeApp()
					},
					okDelay: 20,
					cancelText: "退出客户端",
					size: "xl",
				})
			}
		})
	}, [])

	return (
		<div className="flex-1 overflow-y-auto px-6 py-5">
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2.5">
					<h1 className="text-2xl font-bold tracking-tight">总览</h1>
					<OverviewDateBadge />
				</div>
				<div className="flex items-center gap-2">
					<ButtonTooltip
						content={showFinanceInfo ? "隐藏资金相关信息" : "显示资金相关信息"}
					>
						<button
							type="button"
							onClick={() => setShowFinanceInfo((prev) => !prev)}
							className="h-9 w-9 rounded-md border border-border bg-background grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
						>
							{showFinanceInfo ? <Eye size={16} /> : <EyeOff size={16} />}
						</button>
					</ButtonTooltip>
					<button
						type="button"
						onClick={() => void refetchAccount()}
						className="flex items-center gap-1.5 text-sm border border-border bg-background px-3.5 py-2 rounded-md text-foreground hover:bg-muted/50 transition-colors"
					>
						<RefreshCw
							size={14}
							strokeWidth={1.9}
							className={isRefreshingAccount ? "animate-spin" : ""}
						/>
						刷新全部
					</button>
				</div>
			</div>

			<OverviewMetrics showFinanceInfo={showFinanceInfo} />

			<div className="grid grid-cols-3 gap-4">
				<DataCard />
				<TradingCard />
				<ResearchCard />
			</div>
		</div>
	)
}

export default Home
