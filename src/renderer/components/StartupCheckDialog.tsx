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
import { cn } from "@/renderer/lib/utils"
import {
	AlertTriangle,
	CheckCircle2,
	Circle,
	Loader2,
	ShieldCheck,
	XCircle,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

type StepStatus = "pending" | "running" | "success" | "error" | "warning"

export interface StartupCheckStep {
	id: string
	title: string
	description?: string
	run: () => Promise<{ ok: boolean; detail?: string; warning?: boolean }>
}

interface StepState {
	status: StepStatus
	detail?: string
	error?: string
}

export interface StartupCheckDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	steps: StartupCheckStep[]
	autoCloseDelayMs?: number
}

export function StartupCheckDialog({
	open,
	onOpenChange,
	steps,
	autoCloseDelayMs = 2000,
}: StartupCheckDialogProps) {
	const [states, setStates] = useState<StepState[]>(() =>
		steps.map(() => ({ status: "pending" as StepStatus })),
	)
	const [isRunning, setIsRunning] = useState(false)
	const [isFinished, setIsFinished] = useState(false)
	// -- 用户手动跳过/关闭时，需要中止后续步骤
	const abortedRef = useRef(false)
	const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const stepsRef = useRef(steps)
	stepsRef.current = steps
	// -- 触发重新执行检查的版本号；每次 +1 即重跑
	const [runVersion, setRunVersion] = useState(0)

	const hasError = useMemo(
		() => states.some((s) => s.status === "error"),
		[states],
	)

	const hasWarning = useMemo(
		() => states.some((s) => s.status === "warning"),
		[states],
	)

	const needsManualDismiss = hasError || hasWarning
	const allSuccess = isFinished && !needsManualDismiss

	// biome-ignore lint/correctness/useExhaustiveDependencies: runVersion 仅作为重跑触发令牌
	useEffect(() => {
		if (!open) return
		const currentSteps = stepsRef.current
		abortedRef.current = false
		setIsRunning(true)
		setIsFinished(false)
		setStates(currentSteps.map(() => ({ status: "pending" as StepStatus })))

		const updateStep = (index: number, patch: Partial<StepState>) => {
			setStates((prev) => {
				const next = [...prev]
				next[index] = { ...next[index], ...patch }
				return next
			})
		}
		;(async () => {
			for (let i = 0; i < currentSteps.length; i++) {
				if (abortedRef.current) break

				updateStep(i, { status: "running" })
				try {
					const result = await currentSteps[i].run()
					if (abortedRef.current) break
					const nextStatus: StepStatus = result.warning
						? "warning"
						: result.ok
							? "success"
							: "error"
					updateStep(i, {
						status: nextStatus,
						detail: result.detail,
						error:
							nextStatus === "error"
								? (result.detail ?? "检查未通过")
								: undefined,
					})
				} catch (e) {
					if (abortedRef.current) break
					const msg = e instanceof Error ? e.message : String(e)
					updateStep(i, { status: "error", error: msg })
				}
			}

			if (!abortedRef.current) {
				setIsRunning(false)
				setIsFinished(true)
			}
		})()

		return () => {
			abortedRef.current = true
			if (autoCloseTimerRef.current) {
				clearTimeout(autoCloseTimerRef.current)
				autoCloseTimerRef.current = null
			}
		}
	}, [open, runVersion])

	// -- 全部 success（无 error / warning）则自动关闭
	useEffect(() => {
		if (!open || !allSuccess) return
		autoCloseTimerRef.current = setTimeout(() => {
			onOpenChange(false)
		}, autoCloseDelayMs)
		return () => {
			if (autoCloseTimerRef.current) {
				clearTimeout(autoCloseTimerRef.current)
				autoCloseTimerRef.current = null
			}
		}
	}, [open, allSuccess, autoCloseDelayMs, onOpenChange])

	const handleSkip = () => {
		abortedRef.current = true
		onOpenChange(false)
	}

	const handleRetry = () => {
		setRunVersion((v) => v + 1)
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) abortedRef.current = true
				onOpenChange(next)
			}}
		>
			<DialogContent className="max-w-md gap-4 p-5" disableClose={isRunning}>
				<DialogHeader className="space-y-2">
					<DialogTitle className="flex items-center gap-2 text-base font-semibold leading-snug">
						<ShieldCheck className="size-5 shrink-0 text-primary" />
						启动自检
					</DialogTitle>
					<DialogDescription className="text-xs leading-relaxed">
						正在检查客户端运行环境，全部通过后将自动关闭。检查过程不影响使用，可随时跳过。
					</DialogDescription>
				</DialogHeader>

				<ol className="space-y-2.5">
					{steps.map((step, idx) => {
						const state = states[idx] ?? { status: "pending" }
						return (
							<li
								key={step.id}
								className={cn(
									"flex items-start gap-3 rounded-md border bg-muted/30 px-3 py-2",
									state.status === "error" &&
										"border-destructive/40 bg-destructive/5",
									state.status === "success" &&
										"border-emerald-400/40 bg-emerald-500/5",
									state.status === "warning" &&
										"border-amber-400/40 bg-amber-500/5",
								)}
							>
								<StepIcon status={state.status} />
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<span className="text-xs text-muted-foreground font-mono shrink-0">
											step {idx + 1}
										</span>
										<span className="text-sm font-medium text-foreground truncate">
											{step.title}
										</span>
									</div>
									{step.description ? (
										<p className="text-xs text-muted-foreground leading-snug mt-0.5">
											{step.description}
										</p>
									) : null}
									{state.status === "error" && state.error ? (
										<p className="text-xs text-destructive leading-snug mt-1 break-all">
											{state.error}
										</p>
									) : null}
									{state.status === "success" && state.detail ? (
										<p className="text-xs text-muted-foreground/80 leading-snug mt-1 break-all">
											{state.detail}
										</p>
									) : null}
									{state.status === "warning" && state.detail ? (
										<p className="text-xs text-amber-600 dark:text-amber-400 leading-snug mt-1 break-all">
											{state.detail}
										</p>
									) : null}
								</div>
							</li>
						)
					})}
				</ol>

				<DialogFooter className="mt-1 flex flex-row justify-between gap-2 sm:justify-between">
					<div className="flex items-center text-xs text-muted-foreground">
						{isRunning ? (
							<span className="inline-flex items-center gap-1.5">
								<Loader2 className="size-3 animate-spin" />
								正在检查...
							</span>
						) : allSuccess ? (
							<span className="text-emerald-600 dark:text-emerald-400">
								检查完成，即将关闭
							</span>
						) : hasError ? (
							<span className="text-destructive">
								存在检查未通过项，请处理后重试
							</span>
						) : hasWarning ? (
							<span className="text-amber-600 dark:text-amber-400">
								存在需注意项，请查看说明后手动关闭
							</span>
						) : null}
					</div>
					<div className="flex gap-2">
						{isFinished && needsManualDismiss ? (
							<Button
								variant="outline"
								size="sm"
								className="h-8"
								onClick={handleRetry}
							>
								重新检查
							</Button>
						) : null}
						<Button
							variant={isFinished && needsManualDismiss ? "default" : "ghost"}
							size="sm"
							className="h-8"
							onClick={handleSkip}
						>
							{isRunning ? "跳过检查" : "关闭"}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

function StepIcon({ status }: { status: StepStatus }) {
	if (status === "running") {
		return (
			<Loader2 className="size-5 shrink-0 mt-0.5 animate-spin text-primary" />
		)
	}
	if (status === "success") {
		return <CheckCircle2 className="size-5 shrink-0 mt-0.5 text-emerald-500" />
	}
	if (status === "error") {
		return <XCircle className="size-5 shrink-0 mt-0.5 text-destructive" />
	}
	if (status === "warning") {
		return (
			<AlertTriangle className="size-5 shrink-0 mt-0.5 text-amber-500" />
		)
	}
	return <Circle className="size-5 shrink-0 mt-0.5 text-muted-foreground/40" />
}
