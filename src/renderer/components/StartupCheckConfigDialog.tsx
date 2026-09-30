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
import { startupCheckManualTriggerAtom } from "@/renderer/store/startup-check"
import { useSetAtom } from "jotai"
import {
	BellRing,
	Clock,
	Loader2,
	Play,
	Plus,
	Power,
	ShieldCheck,
	Trash2,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

const DEFAULT_DAILY_TIMES = ["09:15"]

const { getStartupCheckScheduleConfig, setStartupCheckScheduleConfig } =
	window.electronAPI

interface StartupCheckConfigDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onConfigChange?: () => void
}

export function StartupCheckConfigDialog({
	open,
	onOpenChange,
	onConfigChange,
}: StartupCheckConfigDialogProps) {
	const setManualTrigger = useSetAtom(startupCheckManualTriggerAtom)

	const [launchEnabled, setLaunchEnabled] = useState(true)
	const [dailyEnabled, setDailyEnabled] = useState(true)
	const [dailyTimes, setDailyTimes] = useState<string[]>(DEFAULT_DAILY_TIMES)
	const [pushResultEnabled, setPushResultEnabled] = useState(true)
	const [loadingConfig, setLoadingConfig] = useState(false)
	const [saving, setSaving] = useState(false)

	const loadConfig = useCallback(async () => {
		setLoadingConfig(true)
		try {
			const cfg = await getStartupCheckScheduleConfig()
			setLaunchEnabled(cfg.launchEnabled)
			setDailyEnabled(cfg.dailyEnabled)
			setDailyTimes(
				cfg.dailyTimes?.length ? cfg.dailyTimes : DEFAULT_DAILY_TIMES,
			)
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

	function handleDailyTimeChange(index: number, value: string) {
		setDailyTimes((prev) => {
			const next = [...prev]
			next[index] = value
			return next
		})
	}

	function handleAddDailyTime() {
		setDailyTimes((prev) => [...prev, DEFAULT_DAILY_TIMES[0]])
	}

	function handleRemoveDailyTime(index: number) {
		setDailyTimes((prev) => {
			if (prev.length <= 1) return prev
			return prev.filter((_, i) => i !== index)
		})
	}

	async function handleSave() {
		setSaving(true)
		try {
			const res = await setStartupCheckScheduleConfig({
				launchEnabled,
				dailyEnabled,
				dailyTimes,
				pushResultEnabled,
			})
			if (!res.ok) {
				toast.error(res.error ?? "保存失败")
				return
			}
			toast.success("自检配置已保存")
			onConfigChange?.()
			onOpenChange(false)
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "保存失败")
		} finally {
			setSaving(false)
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

				{loadingConfig ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="size-5 animate-spin text-muted-foreground" />
					</div>
				) : (
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
							checked={launchEnabled}
							disabled={loadingConfig}
							onCheckedChange={setLaunchEnabled}
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
									客户端保持运行时在指定时刻自动执行完整自检，可添加多个计划时间。
								</p>
							</div>
						<Switch
							id="startup-check-daily-enabled"
							checked={dailyEnabled}
							disabled={loadingConfig}
							onCheckedChange={setDailyEnabled}
						/>
						</div>

						{dailyEnabled ? (
							<div className="space-y-3 border-t border-border/60 pt-3">
								<div className="flex items-center justify-between gap-2">
									<span className="text-xs font-medium text-muted-foreground">
										执行时间
										{dailyTimes.length > 1
											? ` · ${dailyTimes.length} 个`
											: ""}
									</span>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-7 px-2 text-xs text-foreground hover:text-foreground"
										disabled={loadingConfig}
										onClick={handleAddDailyTime}
									>
										<Plus className="size-3.5 mr-1" />
										添加时间
									</Button>
								</div>

								<div className="divide-y divide-border rounded-md border bg-background/80">
									{dailyTimes.map((time, index) => (
										<div
											key={`daily-time-${index}`}
											className="flex items-center gap-2 px-2 py-1"
										>
											<Input
												type="time"
												step={60}
												className="h-8 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 px-1"
												value={time}
												disabled={loadingConfig}
												onChange={(e) =>
													handleDailyTimeChange(index, e.target.value)
												}
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
												disabled={loadingConfig || dailyTimes.length <= 1}
												onClick={() => handleRemoveDailyTime(index)}
												aria-label="删除计划时间"
											>
												<Trash2 className="size-3.5" />
											</Button>
										</div>
									))}
								</div>

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
							disabled={loadingConfig}
							onCheckedChange={setPushResultEnabled}
						/>
					</div>
				</div>
				)}

				<DialogFooter className="sm:justify-between">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 gap-1.5"
						disabled={saving}
						onClick={handleManualCheck}
					>
						<Play className="size-3.5" />
						立即执行自检
					</Button>
					<Button
						type="button"
						size="sm"
						className="h-8 min-w-[64px]"
						disabled={saving || loadingConfig}
						onClick={() => void handleSave()}
					>
						{saving ? (
							<Loader2 className="size-3.5 animate-spin mr-1.5" />
						) : null}
						保存
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
