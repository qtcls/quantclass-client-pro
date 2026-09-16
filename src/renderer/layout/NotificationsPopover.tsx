/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { NotificationsPanel } from "@/renderer/components/notifications/notifications-panel"
import { Badge } from "@/renderer/components/ui/badge"
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
				<button
					type="button"
					title="通知中心"
					className="relative w-[34px] h-[34px] rounded-lg grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
					aria-label="通知中心"
				>
					<Bell size={18} strokeWidth={1.9} />
					{unread > 0 ? (
						<Badge
							variant="destructive"
							className="absolute right-0 top-0 flex h-3.5 min-w-3.5 translate-x-1/4 -translate-y-1/4 items-center justify-center px-0.5 py-0 text-[9px] leading-none"
						>
							{unread > 99 ? "99+" : unread}
						</Badge>
					) : null}
				</button>
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
