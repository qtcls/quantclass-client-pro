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
	BACKTEST_PAGE,
	DATA_PAGE,
	FAQ_PAGE,
	FUSION_STRATEGY_LIBRARY_PAGE,
	HOME_PAGE,
	NOTIFICATIONS_PAGE,
	POSITION_INFO_PAGE,
	REALTIME_DATA_PAGE,
	REAL_MARKET_CONFIG_PAGE,
	SETTINGS_PAGE,
	STRATEGY_LIBRARY_PAGE,
	STRATEGY_PAGE,
	TRADING_PLAN_PAGE,
} from "@/renderer/constant"
import FAQ from "@/renderer/page/FAQ"
import StrategyRun from "@/renderer/page/backtest"
import Data from "@/renderer/page/data"
import Home from "@/renderer/page/home"
import StrategyLibrary from "@/renderer/page/library"
import FusionStrategyLibrary from "@/renderer/page/library/fusion"
import NotificationsPage from "@/renderer/page/notifications"
import PositionInfo from "@/renderer/page/position"
import RealtimeData from "@/renderer/page/realtime-data"
import StrategySubscription from "@/renderer/page/subscription"
import TradingPlan from "@/renderer/page/trading/plan"
import { ListBulletIcon } from "@radix-ui/react-icons"

import {
	Activity,
	BarChartIcon,
	Bell,
	DatabaseIcon,
	HelpCircleIcon,
	HomeIcon,
	LayoutGrid,
	LibraryIcon,
	Settings,
	WeightIcon,
} from "lucide-react"
import SettingsPage from "../page/settings"
import TradingPage from "../page/trading"

export const ROUTES = [
	{
		key: HOME_PAGE,
		icon: HomeIcon,
		label: "首页",
		element: Home,
	},
	{
		key: DATA_PAGE,
		icon: DatabaseIcon,
		label: "历史数据",
		element: Data,
	},
	{
		key: REALTIME_DATA_PAGE,
		icon: Activity,
		label: "实时数据",
		element: RealtimeData,
	},
	{
		key: STRATEGY_PAGE,
		icon: BarChartIcon,
		label: "策略订阅",
		element: StrategySubscription,
	},
	{
		key: STRATEGY_LIBRARY_PAGE,
		icon: LibraryIcon,
		label: "选股策略",
		element: StrategyLibrary,
	},
	{
		key: FUSION_STRATEGY_LIBRARY_PAGE,
		icon: LibraryIcon,
		label: "综合策略库",
		element: FusionStrategyLibrary,
	},
	{
		key: BACKTEST_PAGE,
		icon: LayoutGrid,
		label: "回测",
		element: StrategyRun,
	},
	{
		key: TRADING_PLAN_PAGE,
		icon: LayoutGrid,
		label: "当日交易",
		element: TradingPlan,
	},
	{
		key: POSITION_INFO_PAGE,
		icon: WeightIcon,
		label: "持仓信息",
		element: PositionInfo,
	},
	{
		key: REAL_MARKET_CONFIG_PAGE,
		icon: ListBulletIcon,
		label: "策略实盘",
		element: TradingPage,
	},
	{
		key: NOTIFICATIONS_PAGE,
		icon: Bell,
		label: "通知中心",
		element: NotificationsPage,
	},
	{
		key: FAQ_PAGE,
		icon: HelpCircleIcon,
		label: "常见问题解答",
		element: FAQ,
	},
	{
		key: SETTINGS_PAGE,
		icon: Settings,
		label: "设置",
		element: SettingsPage,
	},
]
