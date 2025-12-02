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
import { useProductList } from "@/renderer/hooks/useProductList"
import { dataColumns } from "@/renderer/page/data/table/columns"
import { DataTableActionOptions } from "@/renderer/page/data/table/options"
import type { ISubscribeListType } from "@/renderer/schemas/subscribe-schema"
import { isUpdatingAtom } from "@/renderer/store"
import { userAtom } from "@/renderer/store/user"
import type { ColumnDef } from "@tanstack/react-table"
import { useAtomValue } from "jotai"
import { type FC, memo } from "react"

const DataList: FC = () => {
	const {
		update,
		productList,
		isUpdating: isProductUpdating,
	} = useProductList()
	const { roles, isMember } = useAtomValue(userAtom)
	const isUpdating = useAtomValue(isUpdatingAtom)

	return (
		<>
			<DataTable
				pagination={false}
				refresh={update}
				showSelectNum={false}
				data={productList}
				placeholder={"请输入搜索内容..."}
				enableRowSelection={false}
				enableRowSelectionWithRowClick={false}
				loading={isProductUpdating}
				actionOptions={DataTableActionOptions}
				checkboxDisabled={(row) => {
					if (isMember) return false

					const data = row.original as ISubscribeListType
					const courseType = data.course_access?.[0]
					return courseType
						? roles[courseType as keyof typeof roles].disabled
						: true
				}}
				columns={
					dataColumns(async () => update(), isUpdating) as ColumnDef<unknown>[]
				}
				getRowId={undefined}
				classNames={{
					empty: "text-font text-base",
				}}
			/>
		</>
	)
}
export default memo(DataList)
