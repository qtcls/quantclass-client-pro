/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { IMonitorListTypeSchema } from "@/renderer/components/MonitorDialog/monitor-schema"
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
import { monitorProcessesQueryAtom } from "@/renderer/store/query"
import type { Row } from "@tanstack/react-table"
import { useAtom } from "jotai"
import { Loader } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export interface IMonitorRowActionProps<TData> {
	row: Row<TData>
}

const { handleKillProcess } = window.electronAPI

function MonitorRowAction<TData>({ row }: IMonitorRowActionProps<TData>) {
	const task = IMonitorListTypeSchema.parse(row.original)
	const [isConfirmKill, setIsCofirmKill] = useState(false)
	const [saving, setSaving] = useState(false)
	// const [{ refetch }] = useAtom(monitorProcessesQueryAtom)

	return (
		<>
			<Button
				variant="ghost"
				className="text-red-500 hover:text-red-400 dark:text-red-700 dark:hover:text-red-600"
				onClick={() => {
					// refetch()
					setIsCofirmKill(true)
				}}
			>
				终止进程
			</Button>

			<AlertDialog open={isConfirmKill}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="text-red-500 dark:text-red-700">
							该操作可能导致程序出现异常！！！
						</AlertDialogTitle>
						<AlertDialogDescription>
							是否在助教指导下进行？
						</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<AlertDialogCancel>取消</AlertDialogCancel>

						<AlertDialogAction
							onClick={() => {
								setSaving(true)
								if (task.pid) {
									handleKillProcess(task.pid)
									// toast.success("进程已被杀死")
									// setIsCofirmKill(false)
									// refetch()
								}
							}}
						>
							{saving ? (
								<>
									<Loader className="animate-spin h-5 mr-2" /> 正在终止进程...
								</>
							) : (
								<span>终止进程</span>
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

export default MonitorRowAction
