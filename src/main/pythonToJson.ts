/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

// -- Python 代码转换为 JSON 的工具函数

/**
 * 去掉「去掉行首空白后以 # 开头的」整行正文，保留换行，避免误匹配被注释掉的赋值。
 */
function stripLeadingHashCommentLines(code: string): string {
	return code
		.split(/\r?\n/)
		.map((line) => (line.trimStart().startsWith("#") ? "" : line))
		.join("\n")
}

/**
 * -- 从代码中提取变量定义
 * @param code Python 代码
 * @param variableName 变量名
 * @returns 对于字符串类型返回原始字符串，对于列表类型返回 Python 列表格式字符串，未找到返回 null
 */
export function extractVariableFromCode(
	code: string,
	variableName: string,
): string | null {
	try {
		const source = stripLeadingHashCommentLines(code)

		// -- 匹配字符串类型的变量定义，考虑行尾可能有注释
		const regex = new RegExp(`${variableName}\\s*=\\s*["']([^"']*?)["'].*`, "m")
		const stringMatch = source.match(regex)
		if (stringMatch) {
			console.log("提取的值:", stringMatch[1])
			return stringMatch[1] // -- 直接返回匹配的内容，不加引号
		}

		// -- 匹配列表或字典类型的变量定义
		const startMatch = source.match(
			new RegExp(`${variableName}\\s*=\\s*[\\[{]`, "m"),
		)

		if (!startMatch) return null

		const startIndex = startMatch.index! + startMatch[0].length - 1
		let bracketCount = 1
		let endIndex = startIndex + 1

		// -- 遍历字符串查找匹配的闭括号
		for (let i = startIndex + 1; i < source.length; i++) {
			if (source[i] === "[" || source[i] === "{") bracketCount++
			if (source[i] === "]" || source[i] === "}") bracketCount--
			if (bracketCount === 0) {
				endIndex = i + 1
				break
			}
		}

		if (bracketCount !== 0) return null
		// -- 提取变量定义
		const extractedValue = source.substring(startIndex, endIndex)

		// -- 移除多余的空格和换行符
		return extractedValue.trim()
	} catch (error) {
		console.error("解析错误:", error)
		return null
	}
}

/**
 * -- 处理 Python 列表中的元组和注释
 * @param pythonList Python 列表字符串
 * @returns 处理后的字符串
 */
export function processPythonList(pythonList: string): string {
	// -- 移除行尾注释并处理空行
	console.log("pythonList", pythonList)
	const lines = pythonList.split("\n").map((line) => {
		const commentIndex = line.indexOf("#")
		return commentIndex >= 0 ? line.slice(0, commentIndex).trim() : line.trim()
	})
	console.log("lines", lines)

	// -- 过滤掉空行和纯注释行
	const validLines = lines.filter((line) => {
		return line && !line.trim().startsWith("#")
	})
	console.log("validLines", validLines)

	// -- 更健壮地处理多行 tuple 和嵌套 tuple
	// 1. 如果遇到严格为 ( 的行，进入多行 tuple 模式，直到遇到严格为 ) 或 ), 结束
	// 2. 其它行，支持单行和嵌套 tuple (包括 ("a", True, ("b", 1)), ...)
	const processedLines: string[] = []
	let tupleBuffer: string[] = []
	let insideTuple = false

	function replaceTuples(str: string): string {
		// 递归替换所有嵌套的 (x, y, ...) 为 [x, y, ...]
		let prev: string
		let curr = str
		do {
			prev = curr
			curr = curr.replace(/\(([^()]+?)\)/g, (_match, p1) => {
				// 递归处理内部嵌套
				return `[${p1}]`
			})
		} while (curr !== prev)
		return curr
	}

	for (const line of validLines) {
		const trimmed = line.trim()
		// 进入多行 tuple 模式
		if (!insideTuple && trimmed === "(") {
			insideTuple = true
			tupleBuffer.push("[")
			continue
		}
		if (insideTuple) {
			// 检查是否是 tuple 的结束（严格为 ) 或 ), 允许末尾带逗号或空白）
			if (/^\)\s*,?\s*$/.test(trimmed)) {
				tupleBuffer.push("]")
				processedLines.push(tupleBuffer.join("\n"))
				tupleBuffer = []
				insideTuple = false
			} else {
				// 递归处理嵌套 tuple
				tupleBuffer.push(replaceTuples(line))
			}
			continue
		}
		// 其它情况，递归处理单行和嵌套 tuple
		processedLines.push(replaceTuples(line))
	}
	console.log("processedLines", processedLines)
	return processedLines.join("\n")
}

/**
 * -- 将 Python 语法转换为 JSON 兼容的格式
 * @param pythonStr Python 格式的字符串
 * @returns JSON 兼容的字符串
 */
export function convertPythonToJsonCompatible(pythonStr: string): string {
	return (
		pythonStr
			.replace(/True/g, "true")
			.replace(/False/g, "false")
			.replace(/None/g, "null")
			// -- 替换单引号为双引号，但忽略嵌套在双引号中的单引号
			.replace(/'([^']*?)'/g, '"$1"')
			// -- 移除尾随逗号
			.replace(/,(\s*[\]}])/g, "$1")
			// -- 移除多余的空行
			.replace(/^\s*[\r\n]/gm, "")
			// -- 移除行尾空白
			.replace(/\s+$/gm, "")
			// 将分数转换为小数
			.replace(/(\d+)\s*\/\s*(\d+)/g, (match, p1, p2) => {
				console.log("match", match, "p1", p1, "p2", p2)
				return (Number.parseFloat(p1) / Number.parseFloat(p2)).toString()
			})
	)
}

// 删除文件中所有的空行和注释
export function deleteLineComments(content: string) {
	return content
		.replace(/#.*$/gm, "") // 删除单行注释
		.replace(/""".*?"""/gs, "") // 删除多行注释
		.replace(/^\s*$/gm, "") // 删除空行
}

/**
 * -- 将 Python 代码中的变量转换为 JSON
 * @param code Python 代码
 * @param variableName 变量名
 * @returns JSON 字符串，如果转换失败返回 null
 */
export function convertPythonVariableToJson(
	code: string,
	variableName: string,
): string | null {
	try {
		const value = extractVariableFromCode(code, variableName)
		if (!value) return null

		// -- 如果值不是以 [ 开头，说明不是列表，直接返回字符串值
		if (!value.startsWith("[") && !value.startsWith("{")) {
			return value
		}

		// -- 处理列表类型的值
		const processedList = processPythonList(value)
		const jsonCompatible = convertPythonToJsonCompatible(processedList)
		const parsed = JSON.parse(jsonCompatible)

		return JSON.stringify(parsed, null, 2)
	} catch (error) {
		console.error("转换 Python 变量到 JSON 失败:", error)
		return null
	}
}
