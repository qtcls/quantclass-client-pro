/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { isWindows } from "@/renderer/constant"
import { userAtom } from "@/renderer/store/user"
import { useAtomValue } from "jotai"
import { toast } from "sonner"

interface PermissionCheckOptions {
	// -- 是否需要会员权限
	requireMember?: boolean
	// -- 是否仅支持 Windows
	windowsOnly?: boolean
	// -- 是否仅支持 2025 年 1 月 1 日之后
	onlyIn2025?: boolean
	// -- 是否跳过提示
	skipToast?: boolean
	// -- 自定义错误消息
	messages?: {
		requireLogin?: string
		requireMember?: string
		windowsOnly?: string
		onlyIn2025?: string
	}
}

interface CheckResult {
	// -- 是否通过权限检查
	isValid: boolean
	// -- 错误消息
	message?: string
	// -- 错误类型
	type?: "login" | "member" | "windows" | "2025"
}

const { openUrl } = window.electronAPI

const { VITE_XBX_ENV } = import.meta.env

/**
 * -- 权限检查 Hook
 * -- 用于检查用户的登录状态、会员权限、系统要求等
 */
export function usePermissionCheck() {
	const { isLoggedIn, isMember } = useAtomValue(userAtom)

	/**
	 * -- 显示提示信息
	 */
	const showToast = (message: string, type?: "login" | "member") => {
		toast.dismiss()

		if (type === "member") {
			toast.warning(message, {
				action: {
					label: "了解分享会",
					onClick: () => {
						openUrl("https://www.quantclass.cn/fen/class/fen-2025")
					},
				},
			})
			return
		}

		toast.warning(message)
	}

	/**
	 * -- 权限检查函数
	 */
	const check = (options: PermissionCheckOptions = {}): CheckResult => {
		const {
			requireMember = false,
			windowsOnly = false,
			// onlyIn2025 = false,
			skipToast = false,
			messages = {},
		} = options

		// -- 检查登录状态
		if (!isLoggedIn) {
			const message = messages.requireLogin ?? "请先登录"
			!skipToast && showToast(message, "login")
			return { isValid: false, message, type: "login" }
		}

		// -- 检查会员权限
		if (requireMember && !isMember) {
			const message =
				messages.requireMember ?? "本功能暂时仅限策略分享会同学使用"
			!skipToast && showToast(message, "member")
			return { isValid: false, message, type: "member" }
		}

		// -- 检查 2025 年权限
		// if (onlyIn2025 && isOnly2025Member(user?.membershipInfo)) {
		// 	const message =
		// 		messages.onlyIn2025 ??
		// 		"针对目前 2025 的新分享会同学的实盘功能 2025 春节后上线"
		// 	!skipToast && showToast(message)
		// 	return { isValid: false, message, type: "2025" }
		// }

		// -- 检查系统要求
		if (windowsOnly && !isWindows && VITE_XBX_ENV !== "development") {
			const message = messages.windowsOnly ?? "本功能暂时仅支持Windows系统"
			!skipToast && showToast(message)
			return { isValid: false, message, type: "windows" }
		}

		return { isValid: true }
	}

	return { check }
}
