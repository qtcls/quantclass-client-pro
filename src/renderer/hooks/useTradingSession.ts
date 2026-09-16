/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { cn } from "@/renderer/lib/utils"
import {
	getLocalCalendarYmd,
	isLocalYmdTradingDayInCalendar,
} from "@/shared/lib/trading-day"
import dayjs, { type Dayjs } from "dayjs"
import { useCallback, useEffect, useState } from "react"

const { getTradingDays } = window.electronAPI

export type SessionLabel =
	| "休市"
	| "集合竞价"
	| "集合竞价-禁撤"
	| "集合竞价-静默"
	| "交易中"
	| "午休"
	| "集合竞价-禁撒"

export interface TradingSessionInfo {
	label: SessionLabel
	badgeText: string
	badgeClassName: string
	isMarketActive: boolean
	monitorStripText: string
	monitorStripDotClassName: string
	monitorStripTextClassName: string
}

function getIntradaySessionLabel(minutes: number): SessionLabel {
	if (minutes < 9 * 60 + 15) return "休市"
	if (minutes < 9 * 60 + 20) return "集合竞价"
	if (minutes < 9 * 60 + 25) return "集合竞价-禁撤"
	if (minutes < 9 * 60 + 30) return "集合竞价-静默"
	if (minutes < 11 * 60 + 30) return "交易中"
	if (minutes < 13 * 60) return "午休"
	if (minutes < 14 * 60 + 57) return "交易中"
	if (minutes < 15 * 60) return "集合竞价-禁撒"
	return "休市"
}

export function getTradingSessionInfo(
	date: Dayjs,
	tradingDays: string[],
): TradingSessionInfo {
	const ymd = getLocalCalendarYmd(date.toDate())
	const isTradingDay =
		tradingDays.length > 0 && isLocalYmdTradingDayInCalendar(tradingDays, ymd)
	const label: SessionLabel = isTradingDay
		? getIntradaySessionLabel(date.hour() * 60 + date.minute())
		: "休市"
	const dateText = `${date.format("YYYY-MM-DD")} ${date.format("ddd")}`
	const isMarketActive = label === "交易中"

	return {
		label,
		badgeText: `${dateText} · ${label}`,
		badgeClassName: cn(
			isMarketActive
				? "text-green-600 bg-green-500/10"
				: "text-muted-foreground bg-muted/60",
		),
		isMarketActive,
		monitorStripText: isMarketActive ? "沪深交易中" : label,
		monitorStripDotClassName: isMarketActive
			? "bg-green-600 shadow-[0_0_0_3px_rgba(22,163,74,0.2)]"
			: "bg-muted-foreground/40",
		monitorStripTextClassName: isMarketActive
			? "text-foreground"
			: "text-muted-foreground",
	}
}

export function useTradingSession() {
	const [tradingDays, setTradingDays] = useState<string[]>([])
	const [session, setSession] = useState(() =>
		getTradingSessionInfo(dayjs(), []),
	)

	const refreshSession = useCallback((calendar: string[]) => {
		setSession(getTradingSessionInfo(dayjs(), calendar))
	}, [])

	useEffect(() => {
		let cancelled = false

		void getTradingDays().then((calendar) => {
			if (cancelled) return
			setTradingDays(calendar)
			refreshSession(calendar)
		})

		return () => {
			cancelled = true
		}
	}, [refreshSession])

	useEffect(() => {
		const id = setInterval(() => refreshSession(tradingDays), 60_000)
		return () => clearInterval(id)
	}, [tradingDays, refreshSession])

	return session
}
