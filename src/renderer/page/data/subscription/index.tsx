/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { DataTable } from "@/renderer/components/ui/data-table"
import { useDataSubscribed } from "@/renderer/hooks/useDataSubscribed"
import { usePermission } from "@/renderer/hooks/useIdentityArray"
import { useProductList } from "@/renderer/hooks/useProductList"
import {
	transSubscribeData,
	useGenSubscribeColumns,
} from "@/renderer/page/data/subscription/columns"
import { DataTableActionOptions } from "@/renderer/page/data/subscription/options"
import { ISubscribeListType } from "@/renderer/schemas/subscribe-schema"
import { rowSelectionAtom } from "@/renderer/store"
import { ColumnDef } from "@tanstack/react-table"
import { useSetAtom } from "jotai"
import { FC, memo, useEffect, useMemo } from "react"

const DataSubscriptionTable: FC = () => {
	const subscribeColumns = useGenSubscribeColumns()
	const { checkDataListPermission } = usePermission()
	const setRowSelection = useSetAtom(rowSelectionAtom)
	const { dataSubscribedNameList } = useDataSubscribed()
	const { apiProductList, update, isUpdating } = useProductList()

	// 获取需要默认选中的行
	useEffect(() => {
		setRowSelection(
			dataSubscribedNameList.reduce(
				(acc, item) => {
					acc[item] = true
					return acc
				},
				{} as Record<string, boolean>,
			),
		)
	}, [dataSubscribedNameList, setRowSelection])

	const data = useMemo(() => {
		return transSubscribeData(apiProductList)
	}, [apiProductList])

	return (
		<DataTable
			data={data}
			columns={subscribeColumns as ColumnDef<unknown, unknown>[]}
			pagination={false}
			refresh={update}
			showSelectNum={true}
			placeholder="请输入订阅名称..."
			enableRowSelection={true}
			enableRowSelectionWithRowClick={true}
			loading={isUpdating}
			actionOptions={DataTableActionOptions}
			checkboxDisabled={(row) => {
				const data = row.original as ISubscribeListType
				const courseType = data.course_access?.[0]
				return checkDataListPermission(courseType)
			}}
			// @ts-ignore
			getRowId={(row: { key: string }) => row.key}
			classNames={{
				empty: "text-font text-base",
			}}
			rowSelectionAtom={rowSelectionAtom}
		/>
	)
}

export default memo(DataSubscriptionTable)
