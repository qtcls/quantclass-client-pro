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
import { cn } from "@/renderer/lib/utils"
import { IDataListType } from "@/renderer/schemas/data-schema"
import { AnimatePresence, motion } from "framer-motion"
import { SetStateAction } from "jotai"
import { ArrowLeft, ArrowRight, LoaderCircleIcon } from "lucide-react"
import { Dispatch, ReactNode } from "react"

const CheckIcon = ({ className }: { className?: string }) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			className={cn("h-6 w-6", className)}
		>
			<path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
		</svg>
	)
}

const CheckFilled = ({ className }: { className?: string }) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="currentColor"
			className={cn("h-6 w-6", className)}
		>
			<path
				fillRule="evenodd"
				d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
				clipRule="evenodd"
			/>
		</svg>
	)
}

export interface LoadingState {
	loading?: boolean
	text: string | ReactNode
	actionText: string
	action: () => Promise<void>
}

const LoaderCore = ({
	loadingStates,
	value = 0,
	setCurrentState,
}: {
	loadingStates: LoadingState[]
	value?: number
	setCurrentState?: Dispatch<SetStateAction<number>>
}) => {
	const isAnyLoading = loadingStates.some((state) => state.loading)

	return (
		<div className="relative mx-auto mt-40 flex max-w-xl flex-col justify-start">
			{loadingStates.map((loadingState, index) => {
				const distance = Math.abs(index - value)
				const opacity = Math.max(1 - distance * 0.2, 0)

				return (
					<motion.div
						// eslint-disable-next-line react/no-array-index-key
						key={index}
						className={cn("z-30 mb-4 flex items-center gap-2 text-left")}
						initial={{ opacity: 0, y: -(value * 40) }}
						animate={{ opacity, y: -(value * 40) }}
						transition={{ duration: 0.5 }}
					>
						<div>
							{!loadingState.loading && index > value && (
								<CheckIcon className="text-black dark:text-white" />
							)}
							{!loadingState.loading && index <= value && (
								<CheckFilled
									className={cn(
										"text-black dark:text-white",
										value === index &&
											"text-black opacity-100 dark:text-lime-500",
									)}
								/>
							)}
							{loadingState.loading && (
								<LoaderCircleIcon
									className={cn(
										"h-6 w-6 animate-spin text-black dark:text-white",
										value === index &&
											"animate-spin text-black opacity-100 dark:text-lime-500",
									)}
								/>
							)}
						</div>

						<span
							// onClick={async () => {
							//   if (isAnyLoading || loadingState.loading) return

							//   if (value !== index && value > index) {
							//     toast.warning('请先完成当前步骤')

							//     return
							//   }

							//   await loadingState.action()
							// }}
							className={cn(
								"inline-flex w-36 text-black dark:text-white",
								value === index && "text-black opacity-100 dark:text-lime-500",
							)}
						>
							{loadingState.text}
						</span>

						<Button
							size="sm"
							variant="ghost"
							disabled={isAnyLoading || loadingState.loading || index !== value}
							className="h-6 px-2 hover:cursor-pointer lg:px-3"
							onClick={async () => {
								await loadingState.action()
								setCurrentState?.(value + 1)
							}}
						>
							点击{loadingState.actionText}
						</Button>
					</motion.div>
				)
			})}
		</div>
	)
}

export const MultiStepLoader = ({
	task,
	loading,
	loadingStates,
	currentState,
	setCurrentState,
	downloadProgress,
}: {
	task: IDataListType
	loading?: boolean
	stepOneLoading?: boolean
	loadingStates: LoadingState[]
	currentState: number
	setCurrentState?: Dispatch<SetStateAction<number>>
	downloadProgress?: string
}) => {
	const isAnyLoading = loadingStates.some((state) => state.loading)

	return (
		<AnimatePresence mode="wait">
			{loading && (
				<motion.div
					initial={{
						opacity: 0,
					}}
					animate={{
						opacity: 1,
					}}
					exit={{
						opacity: 0,
					}}
					className="fixed inset-0 z-[100] top-10 flex h-[calc(100%-2.5rem)] w-full flex-col items-center justify-center backdrop-blur-2xl bg-background"
				>
					<div className="relative top-0 flex flex-col items-center justify-center gap-1.5">
						<div className="text-xl text-foreground">{task.displayName}</div>
						<div className="text-lg text-muted-foreground">{task.name}</div>
						<div className="text-sm text-muted-foreground">
							{downloadProgress}
						</div>
					</div>

					<div className="relative h-80">
						<LoaderCore
							value={currentState}
							loadingStates={loadingStates}
							setCurrentState={setCurrentState}
						/>
					</div>

					<div className="relative flex gap-1.5">
						<Button
							variant="ghost"
							disabled={isAnyLoading || currentState === 0}
							className="z-[120] px-1 py-0.5 text-black dark:text-white"
							onClick={() => {
								setCurrentState?.(currentState - 1)
							}}
						>
							<ArrowLeft className="h-6 w-6" />
						</Button>

						<Button
							disabled={isAnyLoading}
							variant="ghost"
							className="z-[120] px-1 py-0.5 text-black dark:text-white"
							onClick={() => setCurrentState?.(currentState + 1)}
						>
							<ArrowRight className="h-6 w-6" />
						</Button>
					</div>

					<div className="absolute inset-x-0 bottom-0 z-20 h-full bg-white bg-gradient-to-t [mask-image:radial-gradient(900px_at_center,transparent_30%,white)] dark:bg-black" />
				</motion.div>
			)}
		</AnimatePresence>
	)
}
