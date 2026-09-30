/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { Button } from "@/renderer/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { Input } from "@/renderer/components/ui/input"
import { Label } from "@/renderer/components/ui/label"
import { Switch } from "@/renderer/components/ui/switch"
import { REAL_TRADING_TAB_NAME } from "@/renderer/constant"
import { realConfigEditModalAtom } from "@/renderer/store"
import { activeTabAtom } from "@/renderer/store"
import { realMarketConfigSchemaAtom } from "@/renderer/store/storage"
import type { NotificationWeComConfig } from "@/shared/types/notification-wecom-config.js"
import { useAtomValue, useSetAtom } from "jotai"
import { BellOff, Bot, Cpu, Database, Loader2, Settings2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

const { getNotificationWeComConfig, setNotificationWeComConfig } =
	window.electronAPI

const DEFAULT_CONFIG: NotificationWeComConfig = {
	dndEnabled: false,
	dndStart: "22:00",
	dndEnd: "08:00",
	dataKernelEnabled: true,
	nonDataKernelEnabled: true,
	dailyLimit: 20,
}

interface Props {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function NotificationWeComConfigDialog({ open, onOpenChange }: Props) {
	const [config, setConfig] = useState<NotificationWeComConfig>(DEFAULT_CONFIG)
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)

	const realMarketConfig = useAtomValue(realMarketConfigSchemaAtom)
	const setActiveTab = useSetAtom(activeTabAtom)
	const setRealConfigEditModal = useSetAtom(realConfigEditModalAtom)

	const robotUrl = realMarketConfig?.message_robot_url?.trim() ?? ""
	const robotConfigured = robotUrl.length > 0

	function handleGoToRobotConfig() {
		onOpenChange(false)
		setActiveTab(REAL_TRADING_TAB_NAME)
		setRealConfigEditModal(true)
	}

	const loadConfig = useCallback(async () => {
		setLoading(true)
		try {
			const cfg = await getNotificationWeComConfig()
			if (cfg) setConfig(cfg)
		} catch {
			toast.error("读取推送配置失败")
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		if (open) void loadConfig()
	}, [open, loadConfig])

	async function handleSave() {
		const limit = Number(config.dailyLimit)
		if (!Number.isFinite(limit) || limit < 1) {
			toast.error("每日推送上限至少为 1")
			return
		}
		setSaving(true)
		try {
			await setNotificationWeComConfig({
				...config,
				dailyLimit: Math.floor(limit),
			})
			toast.success("企微推送配置已保存")
			onOpenChange(false)
		} catch {
			toast.error("保存失败")
		} finally {
			setSaving(false)
		}
	}

	function patch(p: Partial<NotificationWeComConfig>) {
		setConfig((prev) => ({ ...prev, ...p }))
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md gap-4 p-5">
				<DialogHeader className="space-y-2">
					<DialogTitle className="flex items-center gap-2 text-base font-semibold leading-snug">
						<Settings2 className="size-5 shrink-0 text-primary" />
						企微推送配置
					</DialogTitle>
					<DialogDescription className="text-xs leading-relaxed">
						配置企业微信通知的推送规则，设置免打扰区间、来源过滤及每日上限。
					</DialogDescription>
				</DialogHeader>

				<div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2.5">
					<div className="flex min-w-0 items-center gap-2">
						<Bot className="size-4 shrink-0 text-muted-foreground" />
						{robotConfigured ? (
							<div className="min-w-0">
								<div className="flex items-center gap-1.5">
									<span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
									<span className="text-xs font-medium text-foreground">
										机器人已配置
									</span>
								</div>
								<p
									className="mt-0.5 max-w-[240px] truncate font-mono text-[10px] text-muted-foreground"
									title={robotUrl}
								>
									{robotUrl}
								</p>
							</div>
						) : (
							<div>
								<div className="flex items-center gap-1.5">
									<span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
									<span className="text-xs font-medium text-foreground">
										机器人未配置
									</span>
								</div>
								<p className="mt-0.5 text-[10px] text-muted-foreground">
									配置后才能推送企业微信
								</p>
							</div>
						)}
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-7 shrink-0 px-2 text-xs"
						onClick={handleGoToRobotConfig}
					>
						{robotConfigured ? "修改" : "去配置"}
					</Button>
				</div>

				{loading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="size-5 animate-spin text-muted-foreground" />
					</div>
				) : (
					<div className="space-y-2.5">
						{/* 免打扰 */}
						<div className="rounded-md border bg-muted/30 px-3 py-3 space-y-3">
							<div className="flex items-center justify-between gap-4">
								<div className="space-y-1 min-w-0">
									<Label className="text-sm font-medium flex items-center gap-1.5">
										<BellOff className="size-3.5" />
										免打扰区间
									</Label>
									<p className="text-xs text-muted-foreground leading-relaxed">
										区间内的通知不推送企业微信。
									</p>
								</div>
								<Switch
									checked={config.dndEnabled}
									onCheckedChange={(v) => patch({ dndEnabled: v })}
								/>
							</div>

							{config.dndEnabled ? (
								<div className="flex items-center gap-3 border-t border-border/60 pt-3">
									<div className="flex-1 space-y-1">
										<Label className="text-xs text-muted-foreground">
											开始时间
										</Label>
										<Input
											type="time"
											step={60}
											className="h-8"
											value={config.dndStart}
											onChange={(e) => patch({ dndStart: e.target.value })}
										/>
									</div>
									<span className="mt-5 text-muted-foreground text-sm">至</span>
									<div className="flex-1 space-y-1">
										<Label className="text-xs text-muted-foreground">
											结束时间
										</Label>
										<Input
											type="time"
											step={60}
											className="h-8"
											value={config.dndEnd}
											onChange={(e) => patch({ dndEnd: e.target.value })}
										/>
									</div>
								</div>
							) : null}
						</div>

						{/* 来源过滤 */}
						<div className="rounded-md border bg-muted/30 px-3 py-3 space-y-2">
							<div className="space-y-1">
								<p className="text-sm font-medium">推送来源</p>
								<p className="text-xs text-muted-foreground leading-relaxed">
									关闭后，该类型的通知不再推送企业微信。
								</p>
							</div>
							<div className="space-y-2.5">
								<div className="flex items-center justify-between gap-4">
									<div className="space-y-0.5 min-w-0">
										<Label className="text-sm flex items-center gap-1.5">
											<Database className="size-3.5 text-muted-foreground" />
											数据内核（Fuel）
										</Label>
										<p className="text-xs text-muted-foreground">
											来自 Fuel 数据内核的通知
										</p>
									</div>
									<Switch
										checked={config.dataKernelEnabled}
										onCheckedChange={(v) => patch({ dataKernelEnabled: v })}
									/>
								</div>
								<div className="flex items-center justify-between gap-4">
									<div className="space-y-0.5 min-w-0">
										<Label className="text-sm flex items-center gap-1.5">
											<Cpu className="size-3.5 text-muted-foreground" />
											非数据内核（Rocket · Fusion · 客户端）
										</Label>
										<p className="text-xs text-muted-foreground">
											来自 Rocket、Fusion 及客户端的通知
										</p>
									</div>
									<Switch
										checked={config.nonDataKernelEnabled}
										onCheckedChange={(v) => patch({ nonDataKernelEnabled: v })}
									/>
								</div>
							</div>
						</div>

						{/* 每日上限 */}
						<div className="rounded-md border bg-muted/30 px-3 py-3 space-y-2">
							<div className="space-y-1">
								<Label className="text-sm font-medium">
									同类通知每日推送上限
								</Label>
								<p className="text-xs text-muted-foreground leading-relaxed">
									同一事件类型每天最多推送企微的条数，超出后不推送。
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Input
									type="number"
									min={1}
									max={200}
									step={1}
									className="h-8 w-24"
									value={config.dailyLimit}
									onChange={(e) =>
										patch({ dailyLimit: Number(e.target.value) })
									}
								/>
								<span className="text-sm text-muted-foreground">条 / 天</span>
							</div>
						</div>
					</div>
				)}

				<div className="flex justify-end gap-2 pt-1">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => onOpenChange(false)}
						disabled={saving}
					>
						取消
					</Button>
					<Button
						type="button"
						size="sm"
						className="min-w-[72px]"
						onClick={() => void handleSave()}
						disabled={saving || loading}
					>
						{saving ? (
							<Loader2 className="size-3.5 animate-spin mr-1.5" />
						) : null}
						保存
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
