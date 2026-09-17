import { Badge } from "@/renderer/components/ui/badge"
import { Button } from "@/renderer/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/renderer/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/renderer/components/ui/table"
import { H3 } from "@/renderer/components/ui/typography"
import {
	formatCreditBalance,
	useCreditBalance,
} from "@/renderer/hooks/useCreditBalance"
import { useCreditRecords } from "@/renderer/hooks/useCreditRecords"
import { cn } from "@/renderer/lib/utils"
import { userAtom } from "@/renderer/store/user"
import type { CreditLedger } from "@/shared/types"
import { useAtomValue } from "jotai"
import { RefreshCw, Wallet, Zap } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

const { openPaymentClientPortal } = window.electronAPI

const CREDIT_CONSUMPTION_RULES = [
	{
		label: "全量恢复",
		value: "5 积分/次",
		description: "单个产品完整重新下载",
	},
	{
		label: "增量更新",
		value: "1 积分/次",
		description: "单个产品增量补齐",
	},
] as const

const CHANGE_TYPE_LABELS: Record<string, string> = {
	purchase: "购买",
	consumption: "消耗",
	gift: "赠送",
}

function getLedgerType(ledger: CreditLedger): string {
	return CHANGE_TYPE_LABELS[ledger.change_type] ?? ledger.change_type ?? "其他"
}

function formatRecordAmount(amount: number): string {
	const prefix = amount > 0 ? "+" : ""
	return `${prefix}${amount.toLocaleString()}`
}

export default function CreditPage() {
	const { isLoggedIn } = useAtomValue(userAtom)
	const { creditBalance, isFetchingCreditBalance, refetchCreditBalance } =
		useCreditBalance(isLoggedIn)
	const {
		creditRecords,
		isLoadingCreditRecords,
		isFetchingCreditRecords,
		refetchCreditRecords,
	} = useCreditRecords(isLoggedIn)
	const [isOpeningPaymentPortal, setIsOpeningPaymentPortal] = useState(false)

	const isRefreshing = isFetchingCreditBalance || isFetchingCreditRecords
	const ledgers = creditRecords?.ledgers ?? []

	const handleRefreshBalance = async () => {
		await refetchCreditBalance()
		toast.success("余额已刷新")
	}

	const handleRefresh = async () => {
		await Promise.all([refetchCreditBalance(), refetchCreditRecords()])
		toast.success("积分信息已刷新")
	}

	const handleOpenPaymentPortal = async () => {
		setIsOpeningPaymentPortal(true)
		try {
			const result = await openPaymentClientPortal()
			if (!result.success) {
				toast.error(result.message || "打开支付页面失败")
			}
		} catch {
			toast.error("打开支付页面失败")
		} finally {
			setIsOpeningPaymentPortal(false)
		}
	}

	return (
		<div className="flex flex-col h-full gap-5 py-3">
			<div className="flex flex-col gap-1">
				<H3>我的积分</H3>
				<p className="text-muted-foreground">查看当前积分余额与积分变动流水</p>
			</div>

			<Card className="shadow-none">
				<CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
					<div className="flex items-center gap-3">
						<Zap className="size-5 text-blue-600 dark:text-blue-400" />
						<div>
							<CardTitle className="text-base">当前积分余额</CardTitle>
							<CardDescription>可用于数据更新等积分消耗任务</CardDescription>
						</div>
					</div>
					<Button
						size="sm"
						disabled={!isLoggedIn || isOpeningPaymentPortal}
						onClick={handleOpenPaymentPortal}
					>
						{isOpeningPaymentPortal ? (
							<RefreshCw className="mr-2 size-4 animate-spin" />
						) : (
							<Wallet className="mr-2 size-4" />
						)}
						充值积分
					</Button>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-2">
						<div className="inline-flex items-center gap-2.5 rounded-full border bg-muted/40 px-5 py-2.5">
							<span className="text-4xl font-bold tabular-nums leading-none tracking-tight">
								{formatCreditBalance(creditBalance?.credit_balance)}
							</span>
							<span className="text-sm text-muted-foreground">积分</span>
						</div>
						<Button
							variant="outline"
							size="icon"
							className="size-12 shrink-0 rounded-full shadow-none"
							disabled={!isLoggedIn || isFetchingCreditBalance}
							title="刷新余额"
							onClick={handleRefreshBalance}
						>
							<RefreshCw
								size={20}
								className={cn(
									"text-muted-foreground",
									isFetchingCreditBalance && "animate-spin",
								)}
							/>
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card className="shadow-none">
				<CardHeader className="pb-4">
					<CardTitle className="text-base">积分消耗规则</CardTitle>
					<CardDescription>
						在数据页对单个产品执行更新，或开启自动更新时，均会消耗积分
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-3 sm:grid-cols-2">
						{CREDIT_CONSUMPTION_RULES.map((rule) => (
							<div
								key={rule.label}
								className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
							>
								<div>
									<p className="text-sm font-medium">{rule.label}</p>
									<p className="text-xs text-muted-foreground">
										{rule.description}
									</p>
								</div>
								<span className="font-mono text-sm whitespace-nowrap">
									{rule.value}
								</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<Card className="flex min-h-0 flex-1 flex-col shadow-none">
				<CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
					<div>
						<CardTitle className="text-base">积分使用 / 购买记录</CardTitle>
						<CardDescription>查看最近的积分消耗、充值记录</CardDescription>
					</div>
					<Button
						variant="outline"
						size="sm"
						disabled={!isLoggedIn || isRefreshing}
						onClick={handleRefresh}
					>
						<RefreshCw
							className={cn("mr-2 size-4", isRefreshing && "animate-spin")}
						/>
						刷新
					</Button>
				</CardHeader>
				<CardContent className="min-h-0 flex-1 overflow-auto pt-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>类型</TableHead>
								<TableHead>描述</TableHead>
								<TableHead className="text-right">变动额度</TableHead>
								<TableHead>订单号</TableHead>
								<TableHead className="text-right">时间</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoadingCreditRecords ? (
								<TableRow>
									<TableCell
										colSpan={5}
										className="h-28 text-center text-muted-foreground"
									>
										加载中...
									</TableCell>
								</TableRow>
							) : ledgers.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={5}
										className="h-28 text-center text-muted-foreground"
									>
										暂无积分记录
									</TableCell>
								</TableRow>
							) : (
								ledgers.map((ledger) => (
									<TableRow key={ledger.uuid}>
										<TableCell>
											<Badge variant="outline">{getLedgerType(ledger)}</Badge>
										</TableCell>
										<TableCell>{ledger.reason || "--"}</TableCell>
										<TableCell
											className={cn(
												"text-right font-medium",
												ledger.amount > 0
													? "text-emerald-600 dark:text-emerald-400"
													: ledger.amount < 0
														? "text-red-600 dark:text-red-400"
														: "",
											)}
										>
											{formatRecordAmount(ledger.amount)}
										</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{ledger.order_id || "--"}
										</TableCell>
										<TableCell className="text-right whitespace-nowrap text-muted-foreground">
											{ledger.create_time || "--"}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	)
}
