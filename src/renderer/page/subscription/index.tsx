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
import { StrategyTableActionOptions } from "@/renderer/components/ui/strategy-table-action-options"
import { H2 } from "@/renderer/components/ui/typography"
import { strategyColumns } from "@/renderer/page/subscription/stg-column"
import { strategyListQueryAtom } from "@/renderer/store/query"
import { useMount } from "etc-hooks"
import { useAtom } from "jotai"
import type { FC } from "react"

const { subscribeScheduleStatus } = window.electronAPI

const StrategySubscription: FC = () => {
	const [{ data, isLoading, refetch }] = useAtom(strategyListQueryAtom)

	useMount(() => {
		subscribeScheduleStatus((_event, status) => {
			if (status === "done") {
				refetch()
			}
		})
	})

	// useUnmount(() => unSubscribeSendScheduleStatusListener())

	return (
		<div className="h-full flex-1 flex-col space-y-8 md:flex">
			<div className="flex items-center justify-between space-y-2">
				<div>
					<H2>策略订阅</H2>
					<p className="text-muted-foreground">
						管理策略订阅，查看策略订阅的状态，以及订阅的策略
					</p>
				</div>
			</div>

			<DataTable
				refresh={refetch}
				loading={isLoading}
				pagination={false}
				data={data?.data?.dataList || []}
				columns={strategyColumns(refetch)}
				actionOptions={StrategyTableActionOptions}
				classNames={{
					empty: "text-font text-base",
				}}
			/>
		</div>
	)
}

export default StrategySubscription
