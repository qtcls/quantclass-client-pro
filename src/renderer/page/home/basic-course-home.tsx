/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { MemberPromoDialog } from "@/renderer/components/member-promo"
import {
	memberPromoBorderClassName,
	memberPromoGradientClassName,
	memberPromoIconBadgeClassName,
	memberPromoMutedTextClassName,
	memberPromoShimmerOverlayClassName,
	memberPromoTextClassName,
} from "@/renderer/components/member-promo/theme"
import { useProductList } from "@/renderer/hooks/useProductList"
import {
	DATA_SECTION_ROUTE,
	QUESTION_FEEDBACK_PAGE,
	TRADING_SECTION_ROUTE,
} from "@/renderer/constant"
import { isUpdatingAtom } from "@/renderer/store"
import { loadAccountQueryAtom } from "@/renderer/store/query"
import {
	realMarketConfigSchemaAtom,
	selectStgListAtom,
} from "@/renderer/store/storage"
import { cn } from "@/renderer/lib/utils"
import { canIncrementalUpdate } from "@/renderer/utils/data-sync-status"
import { useAtom, useAtomValue } from "jotai"
import { ArrowRight, ExternalLink, RefreshCw, Sparkles } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router"

const { openUrl } = window.electronAPI

const LEARNING_LINKS = [
	{
		label: "量搭子·QuantPal",
		desc: "前往回测网站，验证策略思路",
		url: "https://www.quantclass.cn/backtest",
	},
	{
		label: "量化论坛",
		desc: "交流策略思路，讨论学习问题",
		url: "https://bbs.quantclass.cn/",
	},
	{
		label: "课程主页",
		desc: "访问量化课堂，查看课程内容",
		url: "https://www.quantclass.cn/",
	},
]

function DataCenterCard() {
	const navigate = useNavigate()
	const { productList } = useProductList()
	const isUpdating = useAtomValue(isUpdatingAtom)

	const subscribedCount = productList.length
	const laggingCount = useMemo(
		() => productList.filter(canIncrementalUpdate).length,
		[productList],
	)

	const syncStateLabel = isUpdating
		? "同步中"
		: subscribedCount === 0
			? "等待同步"
			: laggingCount === 0
				? "数据就绪"
				: "待更新"

	const syncStateClass =
		isUpdating
			? "text-blue-600"
			: subscribedCount === 0
				? "text-muted-foreground"
				: laggingCount === 0
					? "text-green-600"
					: "text-amber-500"

	return (
		<div className="overflow-hidden rounded-xl border border-border bg-background flex flex-col hover:border-foreground/30 transition-colors">
			<div className="flex items-center justify-between border-b border-border px-4 py-3.5">
				<span className="text-sm font-semibold">数据中心</span>
				<span className="text-xs font-mono font-semibold text-muted-foreground/50">
					01
				</span>
			</div>

			<div className="px-4 py-3.5 flex-1 flex flex-col">
				<div>
					<div className="text-sm font-semibold">课程所需数据</div>
					<div className="mt-0.5 text-xs text-muted-foreground">
						查看下载状态，准备策略运行的数据。
					</div>
				</div>

				<div className="mt-4">
					<div className={`text-xl font-bold tracking-tight ${syncStateClass}`}>
						{syncStateLabel}
					</div>
					<div className="mt-0.5 text-xs text-muted-foreground">
						{isUpdating ? "正在同步数据..." : "最近更新 —"}
					</div>
				</div>

				<div className="mt-4 border-t border-border">
					{[
						{
							label: "已订阅数据",
							value: subscribedCount > 0 ? `${subscribedCount} 份` : "—",
						},
						{
							label: "下载任务",
							value: isUpdating ? "同步中" : "未读取",
						},
						{
							label: "待更新数据",
							value:
								subscribedCount === 0
									? "未读取"
									: laggingCount > 0
										? `${laggingCount} 待更新`
										: "—",
						},
					].map(({ label, value }, i) => (
						<div
							key={label}
							className={`flex items-center justify-between py-2.5 text-sm ${i > 0 ? "border-t border-border" : ""}`}
						>
							<span className="text-muted-foreground">{label}</span>
							<span className="text-xs text-muted-foreground">{value}</span>
						</div>
					))}
				</div>

				<p className="mt-3 text-xs text-muted-foreground">
					完成数据同步后，再开始回测或实盘。
				</p>
			</div>

			<button
				type="button"
				onClick={() => navigate(DATA_SECTION_ROUTE)}
				className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors w-full text-left"
			>
				<span>查看数据状态</span>
				<ArrowRight size={15} strokeWidth={2} />
			</button>
		</div>
	)
}

function TradingStatusCard() {
	const navigate = useNavigate()
	const [{ data: accountData }] = useAtom(loadAccountQueryAtom)
	const realMarketConfig = useAtomValue(realMarketConfigSchemaAtom)
	const selectStgList = useAtomValue(selectStgListAtom)

	const accountId = realMarketConfig?.account_id?.trim() ?? ""
	const hasAccount = accountId !== ""
	const runningCount = selectStgList.filter(
		(s) => (s.cap_weight ?? 0) !== 0,
	).length
	const accountRecord = accountData as Record<string, number> | null
	const totalAssets = accountRecord?.总资产 ?? null
	const availableFunds = accountRecord?.可用资金 ?? null
	const todayPnl = accountRecord?.今日盈亏 ?? null

	const formatMoney = (value: number | null) =>
		value != null ? `¥${value.toLocaleString()}` : "—"

	return (
		<div className="overflow-hidden rounded-xl border border-border bg-background flex flex-col hover:border-foreground/30 transition-colors">
			<div className="flex items-center justify-between border-b border-border px-4 py-3.5">
				<span className="text-sm font-semibold">我的实盘</span>
				<span className="text-xs font-mono font-semibold text-muted-foreground/50">
					02
				</span>
			</div>

			<div className="px-4 py-3.5 flex-1 flex flex-col">
				<div>
					<div className="text-sm font-semibold">交易账户</div>
					<div className="mt-0.5 text-xs text-muted-foreground">
						{hasAccount ? accountId : "尚未连接券商账户"}
					</div>
				</div>

				<div className="mt-4">
					<div className="text-2xl font-bold tracking-tight">
						{formatMoney(totalAssets)}
					</div>
					<div className="mt-0.5 text-xs text-muted-foreground">
						账户总资产 · 元
					</div>
				</div>

				<div className="mt-4 grid grid-cols-2 gap-4">
					<div>
						<div className="text-xs text-muted-foreground">今日盈亏</div>
						<div className="mt-1 text-lg font-bold tracking-tight">
							{formatMoney(todayPnl)}
						</div>
					</div>
					<div>
						<div className="text-xs text-muted-foreground">可用资金</div>
						<div className="mt-1 text-lg font-bold tracking-tight">
							{formatMoney(availableFunds)}
						</div>
					</div>
				</div>

				<div className="mt-4 border-t border-border pt-3">
					<div className="flex items-center justify-between text-sm">
						<span className="font-semibold">策略状态</span>
						<span className="text-xs text-muted-foreground">
							{hasAccount ? `${runningCount} 策略运行中` : "未读取"}
						</span>
					</div>
					<p className="mt-2 text-xs text-muted-foreground">
						连接账户后，查看资产和策略运行情况。
					</p>
				</div>
			</div>

			<button
				type="button"
				onClick={() => navigate(TRADING_SECTION_ROUTE)}
				className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors w-full text-left"
			>
				<span>查看实盘状态</span>
				<ArrowRight size={15} strokeWidth={2} />
			</button>
		</div>
	)
}

function LearningCard() {
	return (
		<div className="overflow-hidden rounded-xl border border-border bg-background flex flex-col hover:border-foreground/30 transition-colors">
			<div className="flex items-center justify-between border-b border-border px-4 py-3.5">
				<span className="text-sm font-semibold">投研与学习</span>
				<span className="text-xs font-mono font-semibold text-muted-foreground/50">
					03
				</span>
			</div>

			<div className="flex-1 flex flex-col">
				{LEARNING_LINKS.map(({ label, desc, url }, i) => (
					<button
						key={label}
						type="button"
						onClick={() => openUrl(url)}
						className={`flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 ${i > 0 ? "border-t border-border" : ""}`}
					>
						<span className="min-w-0 flex-1">
							<span className="block text-sm font-semibold">{label}</span>
							<span className="mt-0.5 block text-xs text-muted-foreground">
								{desc}
							</span>
						</span>
						<ExternalLink
							size={14}
							strokeWidth={1.75}
							className="mt-0.5 shrink-0 text-muted-foreground"
						/>
					</button>
				))}
			</div>

			<div className="flex items-center gap-1.5 px-4 py-3 border-t border-border text-sm text-muted-foreground w-full">
				<ExternalLink size={12} strokeWidth={1.75} className="shrink-0" />
				<span>网站将在新窗口中打开</span>
			</div>
		</div>
	)
}

function BasicCourseHomeFooter() {
	return (
		<div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
			<span>Quantclass · 量化课堂</span>
			<div className="flex items-center gap-4">
				<button
					type="button"
					onClick={() => openUrl(QUESTION_FEEDBACK_PAGE)}
					className="hover:text-foreground transition-colors"
				>
					问题反馈
				</button>
				<button
					type="button"
					onClick={() => openUrl("https://bbs.quantclass.cn/")}
					className="hover:text-foreground transition-colors"
				>
					社区交流
				</button>
			</div>
		</div>
	)
}

export function BasicCourseHome() {
	const [promoOpen, setPromoOpen] = useState(false)
	const [{ refetch: refetchAccount, isFetching }] = useAtom(loadAccountQueryAtom)

	return (
		<div className="flex-1 overflow-y-auto px-6 py-5">
			<div className="flex items-start justify-between mb-5">
				<div>
					<h1 className="text-2xl font-bold tracking-tight mb-1">首页</h1>
					<p className="text-sm text-muted-foreground">
						准备数据，运行实盘，继续你的量化学习。
					</p>
				</div>
				<button
					type="button"
					onClick={() => void refetchAccount()}
					className="flex items-center gap-1.5 text-sm border border-border bg-background px-3.5 py-2 rounded-md text-foreground hover:bg-muted/50 transition-colors mt-1"
				>
					<RefreshCw size={14} strokeWidth={1.9} className={isFetching ? "animate-spin" : ""} />
					刷新状态
				</button>
			</div>

			<div className="mb-4 grid grid-cols-3 gap-4">
				<DataCenterCard />
				<TradingStatusCard />
				<LearningCard />
			</div>

			<div
				className={cn(
					"relative flex w-full items-center gap-5 overflow-hidden rounded-xl border px-5 py-3.5",
					memberPromoGradientClassName,
					memberPromoBorderClassName,
				)}
			>
				<div aria-hidden className={memberPromoShimmerOverlayClassName} />
				<div
					className={cn(
						memberPromoIconBadgeClassName,
						"relative z-10 size-12 rounded-xl bg-white/90",
					)}
				>
					<Sparkles className="size-5 text-violet-500" strokeWidth={1.75} />
				</div>
				<div className="relative z-10 flex-1 min-w-0">
					<div className={cn("text-[11px]", memberPromoMutedTextClassName)}>
						量化课堂 · 策略分享会
					</div>
					<div
						className={cn(
							"text-base font-bold tracking-tight",
							memberPromoTextClassName,
						)}
					>
						基础课程之外，继续交流策略。
					</div>
					<div className={cn("text-xs", memberPromoMutedTextClassName)}>
						了解策略分享会，寻找下一步的学习内容。
					</div>
				</div>
				<button
					type="button"
					onClick={() => setPromoOpen(true)}
					className="relative z-10 flex shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
				>
					了解分享会
					<ExternalLink size={13} />
				</button>
			</div>

			<BasicCourseHomeFooter />

			<MemberPromoDialog
				open={promoOpen}
				onOpenChange={setPromoOpen}
			/>
		</div>
	)
}
