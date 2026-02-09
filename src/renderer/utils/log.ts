import dayjs from "dayjs"

const escapeHtml = (unsafe: string) => {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;")
}

export const formatOutput = (text: string) => {
	return text
		.split("\n")
		.map((line) => {
			// -- 如果是空行，返回一个小高度的空行
			if (!line.trim()) {
				return '<span class="block leading-[0.5] h-0"></span>'
			}

			// -- 保留前导空格
			const spaces = line.match(/^\s*/)?.[0]?.length || 0
			const spaceString = "&nbsp;".repeat(spaces)

			return `<span class="block leading-5 whitespace-pre">${spaceString}${escapeHtml(line.trimLeft())}</span>`
		})
		.join("")
}

export const processLogUpdate = (
	currentOutput: string,
	newOutput: string,
	maxLines = 1000,
): string => {
	// console.log("currentOutput", currentOutput)
	const formattedOutput = formatOutput(newOutput)
	let updatedOutput = currentOutput
		? `${currentOutput}${formattedOutput}`
		: formattedOutput

	const regex = /<span[^>]*>.*?<\/span>/gs
	const matches = updatedOutput.match(regex) || []

	if (matches.length > maxLines) {
		updatedOutput = matches.slice(-maxLines).join("")
	}

	console.log("updatedOutput", updatedOutput.slice(-1))

	return updatedOutput
}

export const createTimestampHeader = () =>
	`<span class="block text-center text-muted-foreground mb-1">-----${dayjs().format(
		"YYYY-MM-DD HH:mm:ss",
	)}-----</span>`
