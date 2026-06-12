/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { DataTablePagination } from "@/renderer/components/ui/data-table-pagination"
import { cn } from "@/renderer/lib/utils"
import { DataTableActionOptionsProps } from "@/renderer/page/data/table/options"
import { rowSelectionAtom } from "@/renderer/store"
import { ValueNoneIcon } from "@radix-ui/react-icons"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@renderer/components/ui/table"
import { rankItem } from "@tanstack/match-sorter-utils"
import {
	ColumnDef,
	ColumnFiltersState,
	FilterFn,
	Row,
	SortingState,
	VisibilityState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table"
import { PrimitiveAtom, useAtom } from "jotai"
import {
	Dispatch,
	FC,
	SetStateAction,
	useMemo,
	useRef,
	useState,
} from "react"

interface DataTableProps<TData, TValue> {
	emptyText?: string
	data: TData[]
	loading: boolean
	isSticky?: boolean
	title?: string
	maxWidth?: string
	_maxHeight?: string
	showSelectNum?: boolean
	enableRowSelection?: boolean
	enableRowSelectionWithRowClick?: boolean
	getRowId?: (row: TData) => string
	refresh?: () => void
	atom?: PrimitiveAtom<Record<string, boolean>>
	columns: Array<ColumnDef<TData, TValue>>
	actionOptions?: FC<DataTableActionOptionsProps<TData>>
	classNames?: {
		container?: string
		tableContainer?: string
		_table?: string
		tableHeader?: string
		header?: string
		body?: string
		cell?: string
		empty?: string
	}
	pagination?:
		| boolean
		| {
				setPageSize: Dispatch<SetStateAction<number>>
				setPageIndex: Dispatch<SetStateAction<number>>
		  }
	placeholder?: string
	checkboxDisabled?: (row: Row<TData>) => boolean
	getRowCanExpand?: (row: Row<TData>) => boolean
	renderSubComponent?: (props: { row: Row<TData> }) => React.ReactElement
	titlePosition?: "top" | "below-action"
	enableVirtualization?: boolean
	tableRef?: React.RefObject<HTMLDivElement>
	fixedWidth?: boolean
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
	// Rank the item
	const itemRank = rankItem(row.getValue(columnId), value)

	// Store the itemRank info
	addMeta({
		itemRank,
	})

	// Return if the item should be filtered in/out
	return itemRank.passed
}

export function DataTable<TData, TValue>({
	data,
	isSticky = true,
	columns,
	refresh,
	classNames,
	placeholder,
	atom = rowSelectionAtom,
	getRowId,
	title,
	maxWidth,
	_maxHeight = "calc(100vh - 21.5em)",
	loading = false,
	pagination = true,
	showSelectNum = false,
	enableRowSelection = false,
	checkboxDisabled,
	getRowCanExpand = () => false,
	actionOptions: ActionOptions,
	titlePosition = "below-action",
	tableRef,
	fixedWidth = false,
}: DataTableProps<TData, TValue>) {
	const { container, tableContainer, _table, tableHeader } =
		classNames || {}
	const [rowSelection, setRowSelection] = useAtom(atom)

	const [sorting, setSorting] = useState<SortingState>([])
	const [globalFilter, setGlobalFilter] = useState("")
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

	const tableContainerRef = useRef<HTMLDivElement>(null)
	const finalTableRef = tableRef || tableContainerRef

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			rowSelection,
			columnFilters,
			columnVisibility,
			globalFilter,
		},
		filterFns: {
			fuzzy: fuzzyFilter,
		},
		enableRowSelection: enableRowSelection
			? (row) => (checkboxDisabled ? !checkboxDisabled(row) : true)
			: false,
		columnResizeMode: "onChange",
		defaultColumn: {
			minSize: 80,
			size: 150,
			maxSize: 1000,
		},
		enableColumnResizing: true,
		getRowId,
		onSortingChange: setSorting,
		onRowSelectionChange: setRowSelection,
		onGlobalFilterChange: setGlobalFilter,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		getRowCanExpand,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
	})

	const rows = useMemo(() => {
		// -- 先获取经过排序和过滤的数据
		const sortedAndFilteredRows = table.getSortedRowModel().rows
		// -- 如果启用了分页，则使用分页后的数据
		return pagination
			? table.getPaginationRowModel().rows
			: sortedAndFilteredRows
	}, [table.getSortedRowModel(), table.getPaginationRowModel(), pagination])

	if (typeof pagination === "object") {
		const { pageIndex, pageSize } = table.getState().pagination
		pagination.setPageSize(pageSize)
		pagination.setPageIndex(pageIndex + 1)
	}

	return (
		<div className={cn("space-y-2", container)}>
			{titlePosition === "top" && title && (
				<div className="text-center">{title}</div>
			)}

			{ActionOptions && (
				<ActionOptions
					table={table}
					refresh={refresh}
					globalFilter={globalFilter}
					placeholder={placeholder ?? ""}
					setGlobalFilter={setGlobalFilter}
				/>
			)}

			{titlePosition === "below-action" && title && (
				<div className="text-center">{title}</div>
			)}

			<div
				ref={finalTableRef}
				className="relative rounded-md border overflow-auto"
				style={{ maxHeight: _maxHeight, maxWidth }}
			>
				<div className={cn("w-full min-w-full", tableContainer)}>
					<Table
						className={cn("bg-white dark:bg-black rounded-lg", _table)}
						style={{
							width: fixedWidth ? table.getCenterTotalSize() : "100%",
							minWidth: fixedWidth ? undefined : table.getCenterTotalSize(),
							maxHeight: _maxHeight,
						}}
					>
						<TableHeader
							className={cn(
								"sticky top-0 z-[8] bg-background rounded-t-md",
								"after:content-[''] after:absolute after:bottom-[-10px] after:left-0 after:right-0 after:h-4 after:bg-gradient-to-b after:from-background after:to-transparent after:pointer-events-none",
								tableHeader,
							)}
						>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => (
										<TableHead
											key={header.id}
											className={cn(
												"z-[1] bg-background border-b relative",
												isSticky && "sticky top-0",
											)}
											style={{
												width: header.getSize(),
												position: "relative",
											}}
										>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
											{header.column.getCanResize() && (
												<div
													onMouseDown={header.getResizeHandler()}
													onTouchStart={header.getResizeHandler()}
													className={cn(
														"absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none",
														header.column.getIsResizing() && "bg-primary",
													)}
												/>
											)}
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{loading ? (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-24 text-center"
									>
										<div className="flex items-center justify-center">
											<div className="flex items-center space-x-2">
												<div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
												<span>加载中...</span>
											</div>
										</div>
									</TableCell>
								</TableRow>
							) : rows.length ? (
								rows.map((row) => (
									<TableRow key={row.id}>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-24 text-center"
									>
										<div className="flex flex-col items-center justify-center space-y-1">
											<ValueNoneIcon className="h-10 w-10 text-muted-foreground" />
											<span className="text-sm text-muted-foreground">
												暂无数据
											</span>
										</div>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>

			{pagination && (
				<DataTablePagination table={table} showSelectNum={showSelectNum} />
			)}
		</div>
	)
}
