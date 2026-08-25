/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import {
	MemberPromoBanner,
	MemberPromoDialog,
} from "@/renderer/components/member-promo"
import { Badge } from "@/renderer/components/ui/badge"
import { Button } from "@/renderer/components/ui/button"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/renderer/components/ui/popover"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/renderer/components/ui/table"
import { H4 } from "@/renderer/components/ui/typography"
import { useBuyBlacklist } from "@/renderer/hooks/useBuyBlacklist"
import { cn } from "@/renderer/lib/utils"
import BuyBlacklistAddInput from "@/renderer/page/trading/buy-blacklist/add-input"
import { userAtom } from "@/renderer/store/user"
import type { BlacklistItem } from "@/renderer/types/trading"
import { checkPermission } from "@/shared/lib/permission"
import { useAtomValue } from "jotai"
import { CircleSlash2, ShieldBan, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export default function BuyBlacklist({
	titleSize,
}: { titleSize?: string | null }) {
	const { buyBlacklist: blacklist, removeBlacklistItem } = useBuyBlacklist()
	const { permissions } = useAtomValue(userAtom)
	const isMember = checkPermission(permissions, "isMember")
	const [promoOpen, setPromoOpen] = useState(false)
	const [deletePopoverOpen, setDeletePopoverOpen] = useState<string | null>(
		null,
	)

	// 删除黑名单项
	const handleRemoveBlacklistItem = async (code: string) => {
		try {
			await removeBlacklistItem(code)
			toast.success(`${code}已从黑名单中移除`)
		} catch (error) {
			console.error("删除黑名单项失败:", error)
			toast.error("删除失败，请重试")
		}

		// 关闭popover
		setDeletePopoverOpen(null)
	}

	// 获取拉黑类型显示文本
	const getBlacklistTypeText = (item: BlacklistItem) => {
		if (item.type === "always") {
			return "🚫 始终不买入"
		}
		if (item.condition) {
			const typeText =
				item.condition.type === "gain"
					? "↑ 涨幅"
					: item.condition.type === "loss"
						? "↓ 跌幅"
						: "↑↓ 振幅"
			return `${typeText}超过${item.condition.threshold}%不买入`
		}
		return "始终不买入"
	}

	const getTableCellColor = (item: BlacklistItem) => {
		switch (item.condition?.type) {
			case "gain":
				return "text-danger"
			case "loss":
				return "text-success"
			case "abs":
				return "text-warning"
			default:
				return ""
		}
	}

	return (
		<>
			{titleSize ? (
				<div className="mb-2 flex w-full items-center gap-3">
					<div className="flex shrink-0 items-center gap-2 text-lg font-bold">
						<ShieldBan />
						买入黑名单
					</div>
					{!isMember && (
						<MemberPromoBanner
							featureName="条件不买入（涨跌幅限制）"
							onLearnMore={() => setPromoOpen(true)}
						/>
					)}
				</div>
			) : (
				<div className="flex w-full items-center gap-3">
					<H4 className="flex shrink-0 items-center gap-2">
						<ShieldBan size={24} /> 买入黑名单
					</H4>
					{!isMember && (
						<MemberPromoBanner
							featureName="条件不买入（涨跌幅限制）"
							onLearnMore={() => setPromoOpen(true)}
						/>
					)}
				</div>
			)}

			<div className="text-muted-foreground pt-1 mb-2 text-sm">
				设置不买入的股票，所有更改
				<span className="font-bold text-primary">下单前设置都有效</span>
				，黑名单内的股票不再会被自动买入（但原有持仓会正常卖出）。如在该股票被下单后设置，会在下次下单时生效。
			</div>
			<BuyBlacklistAddInput />
			{blacklist.length === 0 ? (
				<div className="text-muted-foreground text-sm py-2 flex items-center">
					<CircleSlash2 className="size-4 mr-2" />
					暂无拉黑的股票，请点击上方按钮添加
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>股票代码</TableHead>
							<TableHead>拉黑时间</TableHead>
							<TableHead>拉黑类型</TableHead>
							<TableHead>原因</TableHead>
							<TableHead>操作</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{blacklist.map((item) => (
							<TableRow key={item.code}>
								<TableCell>
									<Badge>{item.code}</Badge>
								</TableCell>
								<TableCell>{item.time}</TableCell>
								<TableCell className={cn(getTableCellColor(item))}>
									{getBlacklistTypeText(item)}
								</TableCell>
								<TableCell>{item.reason || "无"}</TableCell>
								<TableCell>
									<Popover
										open={deletePopoverOpen === item.code}
										onOpenChange={(open) =>
											setDeletePopoverOpen(open ? item.code : null)
										}
									>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												size="sm"
												className="h-6 w-6 p-0 hover:text-destructive"
											>
												<Trash2 className="size-4" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-80" align="end">
											<div className="grid gap-4">
												<div className="space-y-2">
													<h4 className="font-medium leading-none">确认删除</h4>
													<p className="text-sm text-muted-foreground">
														确定要从黑名单中移除股票{" "}
														<strong>{item.code}</strong> 吗？
													</p>
												</div>
												<div className="flex gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => setDeletePopoverOpen(null)}
													>
														取消
													</Button>
													<Button
														variant="destructive"
														size="sm"
														onClick={() => handleRemoveBlacklistItem(item.code)}
													>
														确认删除
													</Button>
												</div>
											</div>
										</PopoverContent>
									</Popover>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
			<MemberPromoDialog
				open={promoOpen}
				onOpenChange={setPromoOpen}
				featureName="条件不买入（涨跌幅限制）"
			/>
		</>
	)
}
