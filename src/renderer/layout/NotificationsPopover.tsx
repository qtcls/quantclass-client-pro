/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl-1.1/
 */

import { NotificationsPanel } from "@/renderer/components/notifications/notifications-panel"
import { Badge } from "@/renderer/components/ui/badge"
import { Button } from "@/renderer/components/ui/button"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/renderer/components/ui/popover"
import { unreadNotificationCountAtom } from "@/renderer/store"
import { useAtomValue, useSetAtom } from "jotai"
import { Bell } from "lucide-react"
import { useEffect, useState } from "react"

export function NotificationsPopover() {
	const [open, setOpen] = useState(false)
	const unread = useAtomValue(unreadNotificationCountAtom)
	const setUnread = useSetAtom(unreadNotificationCountAtom)

	// -- 挂载时拉未读数；订阅 notification:new 实时给铃铛 +1
	useEffect(() => {
		const api = window.electronAPI
		let cancelled = false

		api
			.getUnreadNotificationCount()
			.then((count) => {
				if (!cancelled) setUnread(count)
			})
			.catch(() => {})

		const unsubscribe = api.onNotification((row) => {
			if (!row.read_at) {
				setUnread((prev) => prev + 1)
			}
		})

		return () => {
			cancelled = true
			unsubscribe()
		}
	}, [setUnread])

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="relative h-9 w-9 shrink-0"
					aria-label="通知中心"
				>
					<Bell className="size-5" />
					{unread > 0 ? (
						<Badge
							variant="destructive"
							className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center px-1 py-0 text-[10px] leading-none"
						>
							{unread > 99 ? "99+" : unread}
						</Badge>
					) : null}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				side="bottom"
				sideOffset={8}
				className="flex h-[min(82vh,760px)] w-[min(720px,calc(100vw-2rem))] max-w-[calc(100vw-1rem)] flex-col gap-0 p-4"
				onOpenAutoFocus={(e) => e.preventDefault()}
			>
				<NotificationsPanel />
			</PopoverContent>
		</Popover>
	)
}
