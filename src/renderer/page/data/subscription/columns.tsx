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
import type { ISubscribeListType } from "@/renderer/schemas/subscribe-schema"
import { userAtom } from "@/renderer/store/user"
import type { ColumnDef, Row } from "@tanstack/react-table"
import { useAtomValue } from "jotai"
import { useCallback, useMemo } from "react"

export const useGenSubscribeColumns = (): Array<
	ColumnDef<ISubscribeListType>
> => {
	const { roles, isMember } = useAtomValue(userAtom)

	const isDisabled = useCallback(
		(row: Row<ISubscribeListType>) => {
			if (isMember) return false

			const courseType = row.original.course_access?.[0]
			return courseType
				? roles[courseType as keyof typeof roles].disabled
				: true
		},
		[isMember, roles],
	)

	const columns = useMemo(
		(): ColumnDef<ISubscribeListType>[] => [
			{
				id: "select",
				header: ({ table }) =>
					isMember && (
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
				header: () => <div className="text-foreground" />,
				cell: ({ row }) => {
					const courseType = row.original.course_access?.[0]
					const label = courseType
						? roles[courseType as keyof typeof roles].label
						: ""

					return (
						<TremorBadge variant={courseType === "fen" ? "warning" : "default"}>
							{label}
						</TremorBadge>
					)
				},
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
		[isMember, isDisabled, roles],
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
