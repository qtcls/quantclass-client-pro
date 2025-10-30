/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import Editor from "@monaco-editor/react"
import { useUnmount } from "etc-hooks"
import type { IDisposable, editor } from "monaco-editor"
import { useTheme } from "next-themes"
import React, { useState } from "react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select"
import { useSidebar } from "../ui/sidebar"
import { defaultConfig, editorOptions } from "./config"
import { schema } from "./schema"
import { createSuggestions } from "./suggestions"

const { setStoreValue, rendererLog } = window.electronAPI

// -- 检测 Python 代码中的 strategy_list 变量并转换为 JSON
function detectStgList(code: string): string | null {
	try {
		const jsonStr = null
		if (!jsonStr) return null

		return jsonStr
	} catch (error) {
		rendererLog(
			"error",
			`解析 strategy_list 失败：${JSON.stringify(error, null, 2)}`,
		)
		return null
	}
}

export function ConfigEditor() {
	const { theme } = useTheme()
	const { open } = useSidebar()
	const [value, setValue] = useState<string>()
	const [language, setLanguage] = React.useState<string>("python")
	const editorRef = React.useRef<editor.IStandaloneCodeEditor | null>(null)
	const disposablesRef = React.useRef<IDisposable[]>([])

	// -- 处理语言切换
	const handleLanguageChange = (value: string) => {
		setLanguage(value)
	}

	function handleEditorValidation(markers: editor.IMarker[]) {
		for (const marker of markers) {
			console.log("onValidate:", marker.message)
		}
	}

	// -- 组件卸载时清理
	React.useEffect(() => {
		return () => {
			for (const disposable of disposablesRef.current) {
				disposable.dispose()
			}
			disposablesRef.current = []
			if (editorRef.current) {
				editorRef.current.dispose()
				editorRef.current = null
			}
		}
	}, [])

	function handleEditorMount(
		editor: editor.IStandaloneCodeEditor,
		monaco: typeof import("monaco-editor"),
	) {
		editorRef.current = editor

		// -- 配置 JSON Schema
		monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
			validate: true,
			schemas: [
				{
					uri: "strategy-config.json",
					fileMatch: ["*"],
					schema,
				},
			],
			enableSchemaRequest: true,
			allowComments: true,
		})

		// -- 注册代码提示
		disposablesRef.current.push(
			monaco.languages.registerCompletionItemProvider("json", {
				provideCompletionItems: (model, position) => {
					const word = model.getWordUntilPosition(position)
					const range = {
						startLineNumber: position.lineNumber,
						endLineNumber: position.lineNumber,
						startColumn: word.startColumn,
						endColumn: word.endColumn,
					}

					return { suggestions: createSuggestions(range) }
				},
				triggerCharacters: ['"', ":"],
			}),
		)

		// -- 注册悬浮提示
		disposablesRef.current.push(
			monaco.languages.registerHoverProvider("json", {
				provideHover: (model, position) => {
					const word = model.getWordAtPosition(position)
					if (!word) return null

					// -- 从 suggestions 中获取字段的文档
					const suggestions = createSuggestions({} as any)
					const suggestion = suggestions.find((s) => s.label === word.word)

					return {
						range: new monaco.Range(
							position.lineNumber,
							word.startColumn,
							position.lineNumber,
							word.endColumn,
						),
						contents: [{ value: suggestion?.documentation?.value || "" }],
					}
				},
			}),
		)
	}

	// -- 检测并转换编辑器内容中的 strategy_list 为 JSON
	function detectAndConvertStgList(value: string | undefined) {
		if (!value || !value.includes("strategy_list")) return

		const jsonStr = detectStgList(value)
		if (jsonStr) {
			console.log("检测到 strategy_list 并转换为 JSON:", jsonStr)
			// -- 这里可以根据需要处理转换后的 JSON
			setStoreValue("select_stock.strategy_list", JSON.parse(jsonStr))
			toast.success("解析成功")
		}
	}

	useUnmount(() => {
		for (const disposable of disposablesRef.current) {
			disposable.dispose()
		}
		disposablesRef.current = []
	})

	return (
		<div className="flex flex-col h-full gap-4 px-0.5 py-0.5">
			<div className="flex">
				<Select value={language} onValueChange={handleLanguageChange}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="选择编程语言" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="json">JSON</SelectItem>
						<SelectItem value="python">Python</SelectItem>
					</SelectContent>
				</Select>

				<Button
					onClick={() => {
						detectAndConvertStgList(value)
					}}
				>
					parse & save
				</Button>
			</div>

			<Editor
				height="calc(100% - 2.625rem)"
				width={open ? "calc(100vw - 20.125rem)" : "100%"}
				theme={theme === "dark" ? "vs-dark" : "vs"}
				defaultLanguage={language}
				language={language}
				defaultValue={
					language === "json"
						? JSON.stringify([defaultConfig], null, 2)
						: undefined
				}
				value={value}
				options={editorOptions}
				onValidate={handleEditorValidation}
				onMount={handleEditorMount}
				onChange={(value) => setValue(value)}
			/>
		</div>
	)
}
