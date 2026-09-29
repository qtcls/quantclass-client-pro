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
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { Input } from "@/renderer/components/ui/input"
import { Label } from "@/renderer/components/ui/label"
import { Switch } from "@/renderer/components/ui/switch"
import {
	startupCheckEnabledAtom,
	startupCheckManualTriggerAtom,
} from "@/renderer/store/startup-check"
import { useAtom } from "jotai"
import {
	BellRing,
	Clock,
	Loader2,
	Play,
	Power,
	ShieldCheck,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

const DEFAULT_DAILY_TIME = "09:00"

const {
	getStartupCheckScheduleConfig,
	setStartupCheckDailyEnabled,
	setStartupCheckDailyTime,
	setStartupCheckPushResultEnabled,
} = window.electronAPI

interface StartupCheckConfigDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function StartupCheckConfigDialog({
	open,
	onOpenChange,
}: StartupCheckConfigDialogProps) {
	const [enabled, setEnabled] = useAtom(startupCheckEnabledAtom)
	const [, setManualTrigger] = useAtom(startupCheckManualTriggerAtom)

	const [dailyEnabled, setDailyEnabled] = useState(false)
	const [dailyTime, setDailyTime] = useState(DEFAULT_DAILY_TIME)
	const [pushResultEnabled, setPushResultEnabled] = useState(true)
	const [loadingConfig, setLoadingConfig] = useState(false)
	const [savingDailyEnabled, setSavingDailyEnabled] = useState(false)
	const [savingPushEnabled, setSavingPushEnabled] = useState(false)
	const [savingTime, setSavingTime] = useState(false)

	const loadConfig = useCallback(async () => {
		setLoadingConfig(true)
		try {
			const cfg = await getStartupCheckScheduleConfig()
			setDailyEnabled(cfg.dailyEnabled)
			setDailyTime(cfg.dailyTime || DEFAULT_DAILY_TIME)
			setPushResultEnabled(cfg.pushResultEnabled)
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "读取自检配置失败")
		} finally {
			setLoadingConfig(false)
		}
	}, [])

	useEffect(() => {
		if (open) void loadConfig()
	}, [open, loadConfig])

	const handleManualCheck = () => {
		onOpenChange(false)
		setManualTrigger((v) => v + 1)
	}

	async function handleToggleDailyEnabled(checked: boolean) {
		setSavingDailyEnabled(true)
		try {
			await setStartupCheckDailyEnabled(checked)
			setDailyEnabled(checked)
			toast.success(checked ? "已开启每日定时自检" : "已关闭每日定时自检")
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "保存失败")
		} finally {
			setSavingDailyEnabled(false)
		}
	}

	async function handleSaveDailyTime() {
		setSavingTime(true)
		try {
			const res = await setStartupCheckDailyTime(dailyTime)
			if (!res.ok) {
				toast.error(res.error ?? "保存失败")
				return
			}
			toast.success("已保存每日自检时间")
		} finally {
			setSavingTime(false)
		}
	}

	async function handleTogglePushEnabled(checked: boolean) {
		setSavingPushEnabled(true)
		try {
			await setStartupCheckPushResultEnabled(checked)
			setPushResultEnabled(checked)
			toast.success(checked ? "已开启自检结果推送" : "已关闭自检结果推送")
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "保存失败")
		} finally {
			setSavingPushEnabled(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md gap-4 p-5">
				<DialogHeader className="space-y-2">
					<DialogTitle className="flex items-center gap-2 text-base font-semibold leading-snug">
						<ShieldCheck className="size-5 shrink-0 text-primary" />
						自检配置
					</DialogTitle>
					<DialogDescription className="text-xs leading-relaxed">
						配置客户端启动、每日定时与结果推送行为，或随时手动执行一次完整检查。
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-2.5">
					<div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 px-3 py-3">
						<div className="space-y-1 min-w-0">
							<Label
								htmlFor="startup-check-enabled"
								className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
							>
								<Power className="size-3.5" />
								启动时自动自检
							</Label>
							<p className="text-xs text-muted-foreground leading-relaxed">
								开启后，客户端启动时将自动检查网络、登录、QMT 与数据一致性。
							</p>
						</div>
						<Switch
							id="startup-check-enabled"
							checked={enabled}
							onCheckedChange={setEnabled}
						/>
					</div>

					<div className="rounded-md border bg-muted/30 px-3 py-3 space-y-3">
						<div className="flex items-center justify-between gap-4">
							<div className="space-y-1 min-w-0">
								<Label
									htmlFor="startup-check-daily-enabled"
									className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
								>
									<Clock className="size-3.5" />
									每日定时自检
								</Label>
								<p className="text-xs text-muted-foreground leading-relaxed">
									客户端保持运行时在指定时刻自动执行完整自检。
								</p>
							</div>
							<Switch
								id="startup-check-daily-enabled"
								checked={dailyEnabled}
								disabled={loadingConfig || savingDailyEnabled}
								onCheckedChange={handleToggleDailyEnabled}
							/>
						</div>

						{dailyEnabled ? (
							<div className="flex items-end gap-2">
								<div className="flex-1 space-y-1.5">
									<Label
										htmlFor="startup-check-daily-time"
										className="text-sm font-medium"
									>
										每日执行时间
									</Label>
									<Input
										id="startup-check-daily-time"
										type="time"
										step={60}
										className="h-9"
										value={dailyTime}
										disabled={loadingConfig}
										onChange={(e) => setDailyTime(e.target.value)}
									/>
								</div>
								<Button
									type="button"
									variant="secondary"
									className="h-9 shrink-0"
									disabled={savingTime || loadingConfig}
									onClick={() => void handleSaveDailyTime()}
								>
									{savingTime ? (
										<Loader2 className="size-4 animate-spin mr-1" />
									) : null}
									保存计划
								</Button>
							</div>
						) : null}
					</div>

					<div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 px-3 py-3">
						<div className="space-y-1 min-w-0">
							<Label
								htmlFor="startup-check-push-enabled"
								className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
							>
								<BellRing className="size-3.5" />
								推送自检结果
							</Label>
							<p className="text-xs text-muted-foreground leading-relaxed">
								自检完成后写入通知中心，并通过实盘配置的企业微信机器人推送。
							</p>
						</div>
						<Switch
							id="startup-check-push-enabled"
							checked={pushResultEnabled}
							disabled={loadingConfig || savingPushEnabled}
							onCheckedChange={handleTogglePushEnabled}
						/>
					</div>
				</div>

				<DialogFooter className="sm:justify-end">
					<Button size="sm" className="h-8 gap-1.5" onClick={handleManualCheck}>
						<Play className="size-3.5" />
						立即执行自检
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
