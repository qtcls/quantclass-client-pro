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
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/renderer/components/ui/breadcrumb"
import {
	BACKTEST_PAGE,
	DATA_TAB_NAME,
	FUSION_STRATEGY_LIBRARY_PAGE,
	HOME_PAGE,
	POSITION_INFO_PAGE,
	REAL_MARKET_CONFIG_PAGE,
	REAL_TRADING_TAB_NAME,
	STRATEGY_LIBRARY_PAGE,
	TRADING_PLAN_PAGE,
} from "@/renderer/constant"
import { activeTabAtom } from "@/renderer/store"
import { useAtomValue } from "jotai"
import { useLocation } from "react-router"

const breadcrumbList = {
	[HOME_PAGE]: {
		root: "#",
		title: "首页",
		routes: {
			"/": "",
		},
	},
	[DATA_TAB_NAME]: {
		root: "#data",
		title: "数据中心",
		routes: {
			"/data": "数据订阅",
			"/strategy": "策略订阅",
			"/setting": "数据设置",
		},
	},
	[REAL_TRADING_TAB_NAME]: {
		root: "#trading_plan",
		title: "策略中心",
		routes: {
			[STRATEGY_LIBRARY_PAGE]: "选股策略",
			[FUSION_STRATEGY_LIBRARY_PAGE]: "综合策略库",
			[BACKTEST_PAGE]: "回测",
			[TRADING_PLAN_PAGE]: "当日交易",
			[POSITION_INFO_PAGE]: "持仓信息",
			[REAL_MARKET_CONFIG_PAGE]: "策略实盘",
		},
	},
}

export const _BreadCrumb = () => {
	const { pathname } = useLocation()
	const activeTab = useAtomValue(activeTabAtom)

	// -- 获取二级路由标题
	const getSecondLevelTitle = () => {
		const section = breadcrumbList[activeTab]
		return section.routes[pathname]
	}

	const section = breadcrumbList[activeTab]

	return (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem className="hidden md:block">
					<BreadcrumbLink href={section.root}>{section.title}</BreadcrumbLink>
				</BreadcrumbItem>

				{section.routes && <BreadcrumbSeparator className="hidden md:block" />}
				{section.routes &&
					pathname !== section.root &&
					getSecondLevelTitle() && (
						<BreadcrumbItem>
							<BreadcrumbPage>{getSecondLevelTitle()}</BreadcrumbPage>
						</BreadcrumbItem>
					)}
			</BreadcrumbList>
		</Breadcrumb>
	)
}
