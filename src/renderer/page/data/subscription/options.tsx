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
import { useDataSubscribed } from "@/renderer/hooks/useDataSubscribed"
import { useProductList } from "@/renderer/hooks/useProductList"
import { rowSelectionAtom } from "@/renderer/store"
import { showDataSubModalAtom } from "@/renderer/store/storage"
import { Cross2Icon, ReloadIcon } from "@radix-ui/react-icons"
import { useMutation } from "@tanstack/react-query"
import type { Table } from "@tanstack/react-table"
import { useAtom } from "jotai"
import { Loader2, SaveAll } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

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
	const [, setEditConfig] = useAtom(showDataSubModalAtom)
	const [loading] = useState(false)
	const isFiltered = table.getState().columnFilters.length > 0
	const [rowSelection] = useAtom(rowSelectionAtom)
	const { isUpdating } = useProductList()
	const { setDataSubscribedNameList } = useDataSubscribed()

	const { mutateAsync: saveSubscription, isPending: saveLoading } = useMutation(
		{
			mutationKey: ["save-subscription"],
			mutationFn: async () => {
				// 过滤出 rowSelection 中 value 为 true 的 key
				setDataSubscribedNameList(rowSelection)

				table.resetGlobalFilter()
			},
		},
	)

	useEffect(() => {
		return () => {
			table.resetColumnFilters()
		}
	}, [])

	return (
		<div className="flex justify-between">
			<div className="flex gap-2">
				<Button
					size="sm"
					disabled={saveLoading || isUpdating}
					className="ml-auto h-8 "
					onClick={async () => {
						setEditConfig(false)
						try {
							await saveSubscription()
							toast.success(`订阅数据 ${Object.keys(rowSelection).length} 条`)
						} catch (e) {
							console.log("e", e)
						}
					}}
				>
					{!saveLoading ? (
						<SaveAll className="mr-2 h-4 w-4" />
					) : (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					)}
					确认订阅列表
				</Button>
				<Button
					size="sm"
					variant="outline"
					className="ml-auto h-8 text-foreground "
					onClick={refresh}
					disabled={isUpdating}
				>
					<ReloadIcon className="mr-2 h-4 w-4" /> 刷新列表
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
		</div>
	)
}
