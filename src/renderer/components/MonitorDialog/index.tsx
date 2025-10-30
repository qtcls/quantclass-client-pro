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
import { ScrollArea } from "@/renderer/components/ui/scroll-area"
import { isShowMonitorPanelAtom } from "@/renderer/store"
import { actionDialogAtom } from "@/renderer/store"
import { monitorProcessesQueryAtom } from "@/renderer/store/query"
import { useMount } from "etc-hooks"
import { useAtom, useSetAtom } from "jotai"
import { Loader } from "lucide-react"
import { type FC, useEffect, useState } from "react"
import { toast } from "sonner"
const { handleKillProcess } = window.electronAPI
const MonitorDialog: FC = () => {
	const setIsShowMonitorPanel = useSetAtom(isShowMonitorPanelAtom)
	const [{ data, refetch }] = useAtom(monitorProcessesQueryAtom)
	const [isConfirmKill, setIsCofirmKill] = useAtom(actionDialogAtom)
	const [pid, setPid] = useState<number>(0)
	const [saving, setSaving] = useState(false)
	useEffect(() => {
		console.log("data", data)
	}, [data])
	useMount(() => {
		refetch()
	})
	const dataName = ["pid", "内核名称", "操作名称", "创建时间", "操作"]
	return (
		<>
			<Dialog open onOpenChange={(o) => setIsShowMonitorPanel(o)}>
				<DialogContent className="h-96 max-w-[650px]">
					<DialogHeader>
						<DialogTitle>进程运行状态监控面板</DialogTitle>

						<DialogDescription className="mb-4 font-semibold">
							删除操作请在助教指导下进行，否则可能导致程序出现异常！！！
						</DialogDescription>

						<ScrollArea className="max-h-[35vh] w-full">
							<div className="border flex-col space-y-2 pt-2 px-3">
								<div className="flex items-center">
									{dataName.map((name, index) => (
										<span
											key={index}
											className={`text-sm text-gray-600 ${index === 2 || index === 3 ? "w-2/5" : "w-1/5"}`}
										>
											{name}
										</span>
									))}
								</div>
								<div>
									{data?.map((item, index) => (
										<div
											key={index}
											className="flex items-center justify-between text-sm text-gray-600"
										>
											<span className="w-1/5">{item.pid ?? "未获取到"}</span>
											<span className="w-1/5">{item.kernel ?? "未获取到"}</span>
											<span className="w-2/5">{item.action ?? "未获取到"}</span>
											<span className="w-2/5">
												{item.createdAt ?? "未获取到"}
											</span>
											<div className="w-1/5">
												<Button
													variant="ghost"
													className="text-red-500 hover:text-red-400 dark:text-red-700 dark:hover:text-red-600"
													onClick={() => {
														refetch()
														setPid(item.pid)
														setIsCofirmKill(true)
													}}
												>
													终止进程
												</Button>
											</div>
										</div>
									))}
								</div>
							</div>

							{/* <DataTable
							data={data ?? []}
							// maxWidth="450px"
							columns={monitorColumns()}
							loading={false}
							pagination={false}
						/> */}
						</ScrollArea>
					</DialogHeader>
				</DialogContent>
			</Dialog>
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
						<AlertDialogCancel onClick={() => setIsCofirmKill(false)}>
							取消
						</AlertDialogCancel>
						{saving ? (
							<AlertDialogAction>
								<Loader className="animate-spin h-5 mr-2" /> 正在终止进程...
							</AlertDialogAction>
						) : (
							<AlertDialogAction
								onClick={async () => {
									try {
										// 显示正在处理的状态
										setSaving(true)
										console.log("pid", pid)

										// 调用进程终止函数
										await handleKillProcess(pid)
										toast.success("进程已被杀死")
										refetch()
									} catch (error) {
										console.error("Error killing process:", error)
										toast.error("进程终止失败")
									} finally {
										setIsCofirmKill(false)
										setSaving(false)
									}
								}}
							>
								终止进程
							</AlertDialogAction>
						)}
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

export default MonitorDialog
