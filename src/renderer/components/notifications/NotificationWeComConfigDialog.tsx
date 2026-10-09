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
import { realMarketConfigSchemaAtom } from "@/renderer/store/storage"
import type { NotificationWeComConfig } from "@/shared/types/notification-wecom-config.js"
import { useAtom, useAtomValue } from "jotai"
import { BellOff, Bot, Cpu, Database, Loader2, Settings2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

const {
	getNotificationWeComConfig,
	setNotificationWeComConfig,
	getStoreValue,
	setStoreValue,
	openUrl,
} = window.electronAPI

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
	const [robotUrl, setRobotUrl] = useState("")
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)

	const realMarketConfig = useAtomValue(realMarketConfigSchemaAtom)
	const [, setRealMarketConfig] = useAtom(realMarketConfigSchemaAtom)

	const loadConfig = useCallback(async () => {
		setLoading(true)
		try {
			const [cfg, realMarket] = await Promise.all([
				getNotificationWeComConfig(),
				getStoreValue("real_market_config", {}),
			])
			if (cfg) setConfig(cfg)
			const stored = realMarket as { message_robot_url?: string }
			setRobotUrl(
				String(
					stored.message_robot_url ?? realMarketConfig?.message_robot_url ?? "",
				),
			)
		} catch {
			toast.error("读取推送配置失败")
		} finally {
			setLoading(false)
		}
	}, [realMarketConfig?.message_robot_url])

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
			const trimmedRobotUrl = robotUrl.trim()
			const existing = ((await getStoreValue("real_market_config", {})) ??
				{}) as Record<string, unknown>

			await Promise.all([
				setNotificationWeComConfig({
					...config,
					dailyLimit: Math.floor(limit),
				}),
				setStoreValue("real_market_config", {
					...existing,
					message_robot_url: trimmedRobotUrl,
				}),
			])
			setRealMarketConfig((prev) => ({
				...prev,
				message_robot_url: trimmedRobotUrl,
			}))
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
			<DialogContent className="max-w-lg gap-0 p-0 overflow-hidden flex flex-col">
				<DialogHeader className="shrink-0 px-5 pt-5 pb-4 border-b space-y-1">
					<DialogTitle className="flex items-center gap-2 text-base font-semibold">
						<Settings2 className="size-4 shrink-0 text-primary" />
						企微推送配置
					</DialogTitle>
					<DialogDescription className="text-xs">
						配置机器人地址及推送规则。
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto divide-y">
					{/* 机器人地址 */}
					<div className="px-5 py-4 space-y-2">
						<div className="flex items-center gap-1.5">
							<Bot className="size-3.5 text-muted-foreground shrink-0" />
							<Label className="text-sm font-medium">企业微信机器人</Label>
							<span className="text-xs text-muted-foreground ml-auto">
								机器人配置参考：
								<button
									type="button"
									className="underline hover:no-underline"
									onClick={() =>
										openUrl("https://bbs.quantclass.cn/thread/10975")
									}
								>
									quantclass/10975
								</button>
							</span>
						</div>
						<Input
							value={robotUrl}
							onChange={(e) => setRobotUrl(e.target.value)}
							placeholder="Webhook URL 或 key，可以不填..."
							className="h-8 font-mono text-xs"
							disabled={loading || saving}
						/>
					</div>

					{loading ? (
						<div className="flex items-center justify-center py-10">
							<Loader2 className="size-5 animate-spin text-muted-foreground" />
						</div>
					) : (
						<>
							{/* 免打扰区间 */}
							<div className="px-5 py-4 space-y-3">
								<div className="flex items-center justify-between gap-4">
									<div>
										<Label className="text-sm font-medium flex items-center gap-1.5">
											<BellOff className="size-3.5" />
											免打扰区间
										</Label>
										<p className="text-xs text-muted-foreground mt-0.5">
											区间内的通知不推送企业微信。
										</p>
									</div>
									<Switch
										checked={config.dndEnabled}
										onCheckedChange={(v) => patch({ dndEnabled: v })}
									/>
								</div>
								<div className="flex items-center gap-3">
									<div className="flex-1 space-y-1">
										<Label className="text-xs text-muted-foreground">
											开始时间
										</Label>
										<Input
											type="time"
											step={60}
											className="h-8"
											disabled={!config.dndEnabled}
											value={config.dndStart}
											onChange={(e) => patch({ dndStart: e.target.value })}
										/>
									</div>
									<span className="mt-5 text-sm text-muted-foreground">至</span>
									<div className="flex-1 space-y-1">
										<Label className="text-xs text-muted-foreground">
											结束时间
										</Label>
										<Input
											type="time"
											step={60}
											className="h-8"
											disabled={!config.dndEnabled}
											value={config.dndEnd}
											onChange={(e) => patch({ dndEnd: e.target.value })}
										/>
									</div>
								</div>
							</div>

							{/* 推送来源 */}
							<div className="px-5 py-4 space-y-2.5">
								<div>
									<p className="text-sm font-medium">推送来源</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										关闭后该类型的通知不再推送企业微信。
									</p>
								</div>
								<div className="flex items-center justify-between gap-4">
									<div>
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
									<div>
										<Label className="text-sm flex items-center gap-1.5">
											<Cpu className="size-3.5 text-muted-foreground" />
											实盘内核（Rocket · Fusion · 客户端）
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

							{/* 每日上限 */}
							<div className="px-5 py-4 space-y-2">
								<div>
									<Label className="text-sm font-medium">
										同类通知每日推送上限
									</Label>
									<p className="text-xs text-muted-foreground mt-0.5">
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
						</>
					)}
				</div>

				<div className="flex shrink-0 justify-end gap-2 border-t px-5 py-3">
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
