/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { Checkbox } from "@/renderer/components/ui/checkbox"
import { TremorBadge } from "@/renderer/components/ui/tremor-badge"
import { usePermission } from "@/renderer/hooks/useIdentityArray"
import { ISubscribeListType } from "@/renderer/schemas/subscribe-schema"
import { userAtom } from "@/renderer/store/user"
import { ColumnDef, Row } from "@tanstack/react-table"
import { useAtomValue } from "jotai"
import { useCallback, useMemo } from "react"

const RoleBadge = {
	fen: <TremorBadge variant="warning">分享会</TremorBadge>,
	coin: <TremorBadge>B 圈</TremorBadge>,
	stock: <TremorBadge>股票</TremorBadge>,
}

export const useGenSubscribeColumns = (): Array<
	ColumnDef<ISubscribeListType>
> => {
	const { user } = useAtomValue(userAtom)
	const { checkDataListPermission } = usePermission()

	const isDisabled = useCallback(
		(row: Row<ISubscribeListType>) => {
			const data = row.original

			return checkDataListPermission(data.course_access?.[0])
		},
		[user],
	)

	const columns = useMemo(
		(): ColumnDef<ISubscribeListType>[] => [
			{
				id: "select",
				header: ({ table }) =>
					user?.isMember && (
						<Checkbox
							onCheckedChange={(value) =>
								table.toggleAllPageRowsSelected(!!value)
							}
							aria-label="Select all"
						/>
					),
				cell: ({ row }) => {
					const disabled = isDisabled(row)
					// -- 如果是禁用状态（没有权限）且当前是选中状态，自动取消选择
					if (disabled && row.getIsSelected()) {
						row.toggleSelected(false)
					}

					return (
						<Checkbox
							disabled={disabled}
							checked={row.getIsSelected()}
							onCheckedChange={(value) => row.toggleSelected(!!value)}
							aria-label="Select row"
						/>
					)
				},
				size: 40,
			},
			{
				accessorKey: "title",
				header: () => <div className="text-foreground">数据名称</div>,
				cell: ({ row }) => (
					<div className="text-muted-foreground text-nowrap">
						{row.original.title}
					</div>
				),
			},
			{
				accessorKey: "course_access",
				header: () => <div className="text-foreground"></div>,
				cell: ({ row }) => (
					<>
						{
							RoleBadge[
								row.original.course_access?.[0] as keyof typeof RoleBadge
							]
						}
					</>
				),
			},
			{
				accessorKey: "key",
				header: () => <div className="text-foreground">产品名称</div>,
				cell: ({ row }) => (
					<div className="text-muted-foreground text-nowrap">
						{row.original.key}
					</div>
				),
			},
		],
		[user],
	)

	return columns
}

export const transSubscribeData = (dataApiProductList: any[]) => {
	// 按照course_access是否包含"分享会"进行分组排序
	return [
		...dataApiProductList
			.filter((item) => !item.course_access?.includes("fen"))
			.map((item) => ({
				title: item.displayName,
				key: item.name,
				course_access: item.course_access,
			}))
			.sort((a, b) => a.key.localeCompare(b.key)),
		...dataApiProductList
			.filter((item) => item.course_access?.includes("fen"))
			.map((item) => ({
				title: item.displayName,
				key: item.name,
				course_access: item.course_access,
			}))
			.sort((a, b) => a.key.localeCompare(b.key)),
	]
}
