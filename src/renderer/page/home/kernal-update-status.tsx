/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { useEffect, useRef, useState } from "react"
const { subscribeScheduleStatus, unSubscribeSendScheduleStatusListener } =
	window.electronAPI
import { isUpdatingAtom } from "@/renderer/store"
import { useAtomValue } from "jotai"
import "./index.css"
export function KernalUpdateStatus() {
	const [currentStatus, setCurrentStatus] = useState("") // 用于记录当前正在进行的状态
	const currentStatusRef = useRef(currentStatus)
	const isUpdating = useAtomValue(isUpdatingAtom)

	const data = {
		init: "正在初始化...",
		start: "开始启动，请稍等...",
		rocket_updating: "检查Rocket更新...",
		noTradingTime: "非交易时间，不启动Rocket",
		rocket_start: "正在调用Rocket...",
		fuel_updating: "正在更新Fuel内核...",
		fuel_start: "数据更新中...",
		fusion_updating: "正在更新选股内核...",
		fusion_start: "选股中...",
		done: "",
	}

	const getKernalStatus = (status: string) => {
		const statusList = Object.keys(data)

		const currentIndex = statusList.indexOf(currentStatusRef.current)
		const statusIndex = statusList.indexOf(status)

		// console.log("status", status) // 最新状态
		// console.log("currentStatusRef.current", currentStatusRef.current) //目前正在运行的状态，初始为空
		// console.log("currentStatusRefIndex", currentIndex) //默认是空，在数组中的index为-1
		// console.log("statusIndex", statusIndex)

		// 如果当前状态在数组中的索引大于最新状态的索引，无需更新
		if (currentIndex > statusIndex) {
			// 如果当前状态是"done"，重置currentStatusRef.current为空，避免下一轮执行时状态索引大于最新状态
			if (currentStatusRef.current === "done") {
				currentStatusRef.current = ""
			}
			return // 不更新状态，直接退出
		}

		// 若当前状态小于等于最新状态，更新状态
		setCurrentStatus(status)
		currentStatusRef.current = status
	}

	useEffect(() => {
		subscribeScheduleStatus((_event, status) => {
			// 判断是否需要更新状态
			getKernalStatus(status)
		})
	}, [])
	useEffect(() => {
		if (!isUpdating) {
			unSubscribeSendScheduleStatusListener()
		}
	}, [isUpdating])
	return (
		<>
			<div className="flex gap-2">
				<span className="text-muted">|</span>
				<span className="color-shift-text ">
					{data[currentStatusRef.current]}
				</span>
			</div>
		</>
	)
}
