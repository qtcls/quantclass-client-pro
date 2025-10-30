/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import LoadingAnime from "@/renderer/components/LoadingAnime"
import { Button } from "@/renderer/components/ui/button"
import { DataTableFilterOptions } from "@/renderer/components/ui/data-table-filter-options"
import { Dialog, DialogContent } from "@/renderer/components/ui/dialog"
import { DialogHeader } from "@/renderer/components/ui/dialog"
import { DialogTitle } from "@/renderer/components/ui/dialog"
import DataSubscriptionTable from "@/renderer/page/data/subscription"
import { isUpdatingAtom } from "@/renderer/store"
import { showDataSubModalAtom } from "@/renderer/store/storage"
import { userAtom } from "@/renderer/store/user"
import { Cross2Icon, ReloadIcon } from "@radix-ui/react-icons"
import { useMutation } from "@tanstack/react-query"
import type { Table } from "@tanstack/react-table"
import { useUnmount } from "etc-hooks"
import { useAtom, useAtomValue } from "jotai"
import { ArrowDownNarrowWideIcon, PlusCircle } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

const { handleUpdateOneProduct, fetchFuelStatus, minimizeApp } =
	window.electronAPI

export interface DataTableActionOptionsProps<TData> {
	placeholder: string
	refresh?: () => void
	table: Table<TData>
	globalFilter: string
	setGlobalFilter: (value: string) => void
}

export function DataTableActionOptions<TData>({
	table,
	refresh,
	placeholder,
	globalFilter,
	setGlobalFilter,
}: DataTableActionOptionsProps<TData>) {
	const [loading, setLoading] = useState(false)
	const [isFetching] = useState(false)
	const isLoggedIn = useAtomValue(userAtom)
	const isUpdating = useAtomValue(isUpdatingAtom) // 获取是否正在更新的状态
	const [showDataSubModal, setShowDataSubModal] = useAtom(showDataSubModalAtom)
	const isFiltered = table.getState().columnFilters.length > 0

	const { mutateAsync: updateProduct } = useMutation({
		mutationKey: ["update-all-product"],
		mutationFn: async () => await handleUpdateOneProduct(),
	})

	useUnmount(() => {
		table.resetColumnFilters()
	})

	return (
		<div className="flex justify-between">
			<div className="flex gap-2">
				<Button
					size="sm"
					variant="outline"
					className="ml-auto h-8 text-foreground"
					disabled={isFetching}
					onClick={() => {
						if (!isLoggedIn) {
							toast.dismiss()
							toast.warning("请先登录")
							return
						}
						if (isUpdating) {
							toast.warning("正在更新数据，请暂停更新再添加订阅")
							return
						}
						setShowDataSubModal(true)
					}}
				>
					<PlusCircle size={14} className="mr-2" /> 订阅数据
				</Button>

				<Button
					size="sm"
					variant="outline"
					className="ml-auto h-8 text-foreground"
					disabled={isFetching}
					onClick={() => {
						refresh?.()
						toast.success("数据列表信息刷新成功")
					}}
				>
					<ReloadIcon className="mr-2 h-4 w-4" /> 刷新列表
				</Button>

				<Button
					size="sm"
					variant="outline"
					className="h-8 text-foreground"
					disabled={loading || isUpdating || isFetching}
					onClick={async () => {
						if (!isLoggedIn) {
							toast.dismiss()
							toast.warning("请先登录")
							return
						}

						const fuelStatus = await fetchFuelStatus()
						if (fuelStatus) {
							toast.info("正在自动更新，请稍候...")
							return
						}

						setLoading(true)
						try {
							await updateProduct()
						} finally {
							setLoading(false)
						}
						await minimizeApp("terminal")
						refresh?.()
					}}
				>
					<ArrowDownNarrowWideIcon size={14} className="mr-2" />
					更新数据
				</Button>
			</div>

			<DataTableFilterOptions<TData>
				table={table}
				placeholder={placeholder}
				globalFilter={globalFilter}
				setGlobalFilter={setGlobalFilter}
			/>

			{isFiltered && (
				<Button
					variant="ghost"
					onClick={() => table.resetColumnFilters()}
					className="h-8 px-2 lg:px-3"
				>
					清除筛选
					<Cross2Icon className="ml-2 h-4 w-4" />
				</Button>
			)}
			<LoadingAnime loading={loading} content="更新中..." />
			<Dialog
				open={showDataSubModal}
				onOpenChange={(value) => setShowDataSubModal(value)}
			>
				<DialogContent className="max-w-4xl p-4">
					<DialogHeader>
						<DialogTitle>确认订阅列表</DialogTitle>
					</DialogHeader>
					<DataSubscriptionTable />
				</DialogContent>
			</Dialog>
		</div>
	)
}
