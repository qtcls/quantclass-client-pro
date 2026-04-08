/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { Badge } from "@/renderer/components/ui/badge"
import { Button } from "@/renderer/components/ui/button"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/renderer/components/ui/card"
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/renderer/components/ui/carousel"
import { Skeleton } from "@/renderer/components/ui/skeleton"
import {
	stockTimingCardExpandedSetAtom,
	stockTimingCarouselModeAtom,
	stockTimingDateModeAtom,
	stockTimingViewAtom,
} from "@/renderer/store/stock-timing-view"
import type {
	StockTimingMatrixRow,
	StockTimingStrategyBlock,
	StockTimingTimeSlot,
} from "@/shared/types/stock-timing-view"
import { ReloadIcon } from "@radix-ui/react-icons"
import { useAtom, useSetAtom } from "jotai"
import {
	ChevronDown,
	ChevronUp,
	Columns2,
	LayoutList,
	LineChart,
} from "lucide-react"
import { toast } from "sonner"

const TIME_SLOTS: StockTimingTimeSlot[] = ["0930", "1030", "1300", "1400"]

const SLOT_LABEL: Record<StockTimingTimeSlot, string> = {
	"0930": "09:30",
	"1030": "10:30",
	"1300": "13:00",
	"1400": "14:00",
}

function SignalCell({ value }: { value: number | null }) {
	if (value === null)
		return <span className="text-muted-foreground text-xs font-mono">—</span>
	return (
		<span className="text-foreground text-xs font-mono font-semibold">
			{value}
		</span>
	)
}

function StockRow({ stock }: { stock: StockTimingMatrixRow }) {
	return (
		<div className="flex items-center gap-2 py-1.5 border-b last:border-0">
			<div className="flex-1 min-w-0">
				<div className="text-sm font-medium truncate">{stock.stockName}</div>
				<div className="text-xs text-muted-foreground truncate">
					{stock.stockCode} · {stock.offset}
				</div>
			</div>
			<div className="flex gap-3 shrink-0">
				{TIME_SLOTS.map((slot) => (
					<div key={slot} className="flex flex-col items-center w-10">
						<span className="text-[10px] text-muted-foreground mb-0.5">
							{SLOT_LABEL[slot]}
						</span>
						<SignalCell value={stock.signals[slot]} />
					</div>
				))}
			</div>
		</div>
	)
}

function StrategyCard({
	block,
	index,
}: { block: StockTimingStrategyBlock; index: number }) {
	const [expandedSet, setExpandedSet] = useAtom(stockTimingCardExpandedSetAtom)
	const isExpanded = expandedSet.has(index)

	const toggleExpanded = () => {
		setExpandedSet((prev) => {
			const next = new Set(prev)
			if (next.has(index)) {
				next.delete(index)
			} else {
				next.add(index)
			}
			return next
		})
	}

	return (
		<Card className="w-full">
			<div className="flex items-center justify-between px-3 py-2 border-b">
				<span className="text-sm font-semibold truncate flex-1 mr-2">
					{block.strategyName}
				</span>
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6 shrink-0"
					onClick={toggleExpanded}
				>
					{isExpanded ? (
						<ChevronUp className="h-3.5 w-3.5" />
					) : (
						<ChevronDown className="h-3.5 w-3.5" />
					)}
				</Button>
			</div>
			<div className="px-3 py-1">
				{block.stocks.length === 0 ? (
					<div className="text-xs text-muted-foreground py-2 text-center">
						暂无数据
					</div>
				) : (
					<div
						className={isExpanded ? undefined : "overflow-y-auto max-h-[112px]"}
					>
						{block.stocks.map((stock) => (
							<StockRow
								key={`${stock.stockCode}-${stock.offset}`}
								stock={stock}
							/>
						))}
					</div>
				)}
			</div>
		</Card>
	)
}

export default function StockTimingView() {
	const [dateMode, setDateMode] = useAtom(stockTimingDateModeAtom)
	const [carouselMode, setCarouselMode] = useAtom(stockTimingCarouselModeAtom)
	const setExpandedSet = useSetAtom(stockTimingCardExpandedSetAtom)
	const [{ data: matrix, isPending, refetch }] = useAtom(stockTimingViewAtom)

	const handleRefetch = () => {
		refetch()
		toast.success("个股择时数据刷新成功")
	}

	const handleDateMode = (mode: "today" | "yesterday") => {
		setDateMode(mode)
		setExpandedSet(new Set<number>())
	}

	const handleToggleLayout = () => {
		setCarouselMode((v) => !v)
		setExpandedSet(new Set<number>())
	}

	return (
		<Card className="w-full">
			<CardHeader className="border-b px-4 py-3">
				<CardTitle className="pt-0 mt-0 flex flex-row justify-between items-center gap-1">
					<div className="flex items-center flex-wrap gap-2">
						<LineChart className="w-5 h-5" />
						个股择时
						<Badge variant="info">测试版</Badge>
						<span className="text-xs text-muted-foreground font-medium">
							( 每分钟自动刷新一次 )
						</span>
					</div>
					<div className="flex gap-2 flex-wrap justify-end items-center">
						<Button
							size="sm"
							className="h-8"
							variant={dateMode === "today" ? "default" : "outline"}
							onClick={() => handleDateMode("today")}
						>
							今天
						</Button>
						<Button
							size="sm"
							className="h-8"
							variant={dateMode === "yesterday" ? "default" : "outline"}
							onClick={() => handleDateMode("yesterday")}
						>
							昨天
						</Button>
						<Button
							size="sm"
							className="h-8"
							variant="outline"
							onClick={handleRefetch}
						>
							<ReloadIcon className="mr-2 h-4 w-4" />
							刷新
						</Button>
						<Button
							size="sm"
							className="h-8"
							variant={carouselMode ? "outline" : "default"}
							onClick={handleToggleLayout}
							title={carouselMode ? "切换为纵向列表" : "切换为轮播（每屏两张）"}
						>
							{carouselMode ? (
								<LayoutList className="h-4 w-4" />
							) : (
								<Columns2 className="h-4 w-4" />
							)}
						</Button>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent className="px-4 py-3">
				{isPending ? (
					<div className="flex gap-3">
						<Skeleton className="h-36 flex-1 rounded-lg" />
						<Skeleton className="h-36 flex-1 rounded-lg" />
					</div>
				) : !matrix || matrix.length === 0 ? (
					<div className="text-sm text-muted-foreground text-center py-4">
						暂无个股择时数据
					</div>
				) : carouselMode ? (
					<Carousel
						opts={{ align: "start", slidesToScroll: 1 }}
						className="w-full px-10"
					>
						<CarouselContent className="-ml-4">
							{matrix.map((block, i) => (
								<CarouselItem
									key={block.strategyName}
									className="pl-4 basis-2/3"
								>
									<StrategyCard block={block} index={i} />
								</CarouselItem>
							))}
						</CarouselContent>
						<CarouselPrevious className="-left-2" />
						<CarouselNext className="-right-2" />
					</Carousel>
				) : (
					<div className="flex flex-col gap-3">
						{matrix.map((block, i) => (
							<StrategyCard key={block.strategyName} block={block} index={i} />
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
