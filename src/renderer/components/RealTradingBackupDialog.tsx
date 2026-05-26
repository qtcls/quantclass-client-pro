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
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/renderer/components/ui/alert-dialog"
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
import { Archive, Loader2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

const DEFAULT_TIME = "15:10"

export interface RealTradingBackupDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function RealTradingBackupDialog({
	open,
	onOpenChange,
}: RealTradingBackupDialogProps) {
	const [dailyTime, setDailyTime] = useState(DEFAULT_TIME)
	const [enabled, setEnabled] = useState(true)
	const [sourceDir, setSourceDir] = useState("")
	const [backupDir, setBackupDir] = useState("")
	const [loadingConfig, setLoadingConfig] = useState(false)
	const [savingTime, setSavingTime] = useState(false)
	const [savingEnabled, setSavingEnabled] = useState(false)
	const [runningBackup, setRunningBackup] = useState(false)
	const [configWarning, setConfigWarning] = useState<string | null>(null)
	const [backupConfirmOpen, setBackupConfirmOpen] = useState(false)

	const loadConfig = useCallback(async () => {
		setLoadingConfig(true)
		setConfigWarning(null)
		try {
			const cfg = await window.electronAPI.getRealTradingBackupConfig()
			setEnabled(cfg.enabled)
			setDailyTime(cfg.dailyTime || DEFAULT_TIME)
			setSourceDir(cfg.sourceDir)
			setBackupDir(cfg.backupDir)
			if (cfg.warning) {
				setConfigWarning(cfg.warning)
				toast.warning(cfg.warning)
			}
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "读取备份配置失败")
		} finally {
			setLoadingConfig(false)
		}
	}, [])

	useEffect(() => {
		if (open) {
			void loadConfig()
		} else {
			setBackupConfirmOpen(false)
		}
	}, [open, loadConfig])

	async function handleToggleEnabled(checked: boolean) {
		setSavingEnabled(true)
		try {
			await window.electronAPI.setRealTradingBackupEnabled(checked)
			setEnabled(checked)
			toast.success(checked ? "已开启自动备份" : "已关闭自动备份")
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "保存备份开关失败")
		} finally {
			setSavingEnabled(false)
		}
	}

	async function handleSaveTime() {
		setSavingTime(true)
		try {
			const res =
				await window.electronAPI.setRealTradingBackupDailyTime(dailyTime)
			if (!res.ok) {
				toast.error(res.error ?? "保存失败")
				return
			}
			toast.success("已保存每日备份时间，客户端将在该时刻自动执行备份")
		} finally {
			setSavingTime(false)
		}
	}

	async function handleBackupNow() {
		setRunningBackup(true)
		try {
			const res = await window.electronAPI.runRealTradingBackupNow()
			if (!res.ok) {
				toast.error(res.error ?? "备份失败")
				return
			}
			toast.success(
				res.zipPath
					? `实盘数据备份已完成：${res.zipPath}`
					: "实盘数据备份已完成",
			)
		} finally {
			setRunningBackup(false)
		}
	}

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-xl gap-4 p-5">
					<DialogHeader className="space-y-2">
						<DialogTitle className="flex items-center gap-2 text-lg font-semibold leading-snug">
							<Archive className="size-5 shrink-0" />
							备份实盘数据
						</DialogTitle>
						<DialogDescription className="text-sm leading-relaxed">
							在此开启或关闭自动备份，并设置备份时间；数据量大时耗时较长，请保持该时段客户端在线。
						</DialogDescription>
					</DialogHeader>

					<div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2.5">
						<div className="space-y-0.5">
							<Label
								htmlFor="real-backup-enabled"
								className="text-sm font-medium"
							>
								开启自动备份
							</Label>
							<p className="text-xs text-muted-foreground">
								关闭后不会在设定时间自动备份实盘数据。
							</p>
						</div>
						<Switch
							id="real-backup-enabled"
							checked={enabled}
							disabled={loadingConfig || savingEnabled}
							onCheckedChange={(checked) => void handleToggleEnabled(checked)}
						/>
					</div>

					<div className="space-y-3 text-sm">
						<div className="rounded-md border bg-muted/40 px-3 py-2.5 text-muted-foreground leading-normal">
							<p className="mb-1.5 font-medium text-foreground text-sm">
								备份与清理规则
							</p>
							<ul className="list-disc space-y-1 pl-4 marker:text-muted-foreground/80">
								<li>
									<span className="font-medium text-foreground">内容：</span>
									将设置里「存储路径」下的{" "}
									<span className="font-mono">real_trading</span>{" "}
									实盘数据备份到保存目录。
								</li>
								<li>
									<span className="font-medium text-foreground">形式：</span>
									zip 文件（快速打包，文件名含日期时间戳）。
								</li>
								<li>
									<span className="font-medium text-foreground">定时：</span>
									到达下方时刻时，若当天为{" "}
									<span className="font-mono">period_offset.csv</span>{" "}
									中的交易日且客户端已启动、且已开启自动备份，则执行；非交易日不执行。读不到交易日历时不自动备份。
								</li>
								<li>
									<span className="font-medium text-foreground">清理：</span>
									每次备份前按修改时间删除早于「往前第 2 个交易日 0 点」的
									zip（依据数据目录 period_offset.csv 交易日期列），约保留 3
									份（含当日）。
								</li>
							</ul>
						</div>

						{configWarning ? (
							<p className="text-sm text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 rounded-md px-2 py-1.5">
								{configWarning}
							</p>
						) : null}

						<div className="space-y-1">
							<span className="text-xs font-medium text-muted-foreground">
								源目录（存储路径/real_trading）
							</span>
							<p className="font-mono text-xs leading-snug break-all rounded border bg-background px-2 py-1.5">
								{loadingConfig ? "…" : sourceDir || "—"}
							</p>
						</div>
						<div className="space-y-1">
							<span className="text-xs font-medium text-muted-foreground">
								备份保存目录
							</span>
							<p className="font-mono text-xs leading-snug break-all rounded border bg-background px-2 py-1.5">
								{loadingConfig ? "…" : backupDir || "—"}
							</p>
						</div>

						<div className="flex flex-col gap-2 sm:flex-row sm:items-end">
							<div className="flex-1 space-y-1.5">
								<Label
									htmlFor="real-backup-time"
									className="text-sm font-medium"
								>
									每日自动备份时间
								</Label>
								<Input
									id="real-backup-time"
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
								className="h-9 shrink-0 sm:mb-px"
								disabled={loadingConfig || savingTime}
								onClick={() => void handleSaveTime()}
							>
								{savingTime ? (
									<Loader2 className="size-4 animate-spin mr-1" />
								) : null}
								保存计划
							</Button>
						</div>

						<div className="space-y-2 pt-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8 w-fit"
								disabled={
									runningBackup ||
									loadingConfig ||
									!sourceDir ||
									Boolean(configWarning)
								}
								onClick={() => setBackupConfirmOpen(true)}
							>
								{runningBackup ? (
									<Loader2 className="size-3.5 animate-spin mr-1.5" />
								) : (
									<Archive className="size-3.5 mr-1.5" />
								)}
								手动备份
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<AlertDialog open={backupConfirmOpen} onOpenChange={setBackupConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>确认立即备份？</AlertDialogTitle>
						<AlertDialogDescription className="space-y-2">
							<p>
								将备份实盘数据到「备份保存目录」。数据量大时可能耗时较长，期间请尽量不要关闭客户端。
							</p>
							{sourceDir ? (
								<p className="font-mono text-xs break-all text-foreground/90">
									{sourceDir}
								</p>
							) : null}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>取消</AlertDialogCancel>
						<AlertDialogAction asChild>
							<Button
								onClick={() => {
									setBackupConfirmOpen(false)
									void handleBackupNow()
								}}
							>
								开始备份
							</Button>
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
