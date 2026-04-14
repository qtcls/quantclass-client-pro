const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")
const os = require("os")

const ROOT = path.resolve(__dirname, "..")
const RESOURCES_DIR = path.join(ROOT, "resources", "python")

const DEFAULT_STANDALONE_TAG = "20260408"
/** 与 DEFAULT_STANDALONE_TAG 的 release 中 3.11 install_only 资源名一致 */
const DEFAULT_PYTHON_VERSION = "3.11.15"

const TAG = process.env.PYTHON_STANDALONE_TAG || DEFAULT_STANDALONE_TAG
const PY_VERSION = process.env.PYTHON_VERSION || DEFAULT_PYTHON_VERSION

const GITHUB_PREFIX = `https://github.com/astral-sh/python-build-standalone/releases/download/${TAG}`

const TRIPLE_MAP = {
	"darwin-arm64": "aarch64-apple-darwin",
	"darwin-x64": "x86_64-apple-darwin",
	"win32-x64": "x86_64-pc-windows-msvc",
	"linux-x64": "x86_64-unknown-linux-gnu",
}

const DIRS_TO_TRIM = [
	"test",
	"tests",
	"__pycache__",
	"tkinter",
	"_tkinter",
	"idlelib",
	"idle_test",
	"ensurepip",
	"turtledemo",
	"pydoc_data",
	"lib2to3",
	"turtle.py",
	"include",
	"share",
]

function parseArgs() {
	const args = process.argv.slice(2)
	let arch = null
	let allArchs = false
	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--arch" && args[i + 1]) {
			arch = args[++i]
		} else if (args[i] === "--all-archs") {
			allArchs = true
		}
	}
	return { arch, allArchs }
}

function getArchsToDownload(opts) {
	if (opts.allArchs && process.platform === "darwin") {
		return ["arm64", "x64"]
	}
	if (opts.arch) return [opts.arch]
	return [process.arch]
}

function buildUrl(platform, arch) {
	const key = `${platform}-${arch}`
	const triple = TRIPLE_MAP[key]
	if (!triple) {
		console.error(`不支持的平台/架构组合: ${key}`)
		console.error(`支持: ${Object.keys(TRIPLE_MAP).join(", ")}`)
		process.exit(1)
	}
	const filename = `cpython-${PY_VERSION}+${TAG}-${triple}-install_only.tar.gz`
	const mirror = process.env.PYTHON_MIRROR
	return mirror ? `${mirror}/${filename}` : `${GITHUB_PREFIX}/${filename}`
}

function downloadAndExtract(platform, arch) {
	const targetDir = path.join(RESOURCES_DIR, arch)
	const markerFile = path.join(targetDir, ".python-version")

	if (
		fs.existsSync(markerFile) &&
		fs.readFileSync(markerFile, "utf-8").trim() === `${PY_VERSION}+${TAG}`
	) {
		console.log(
			`[download-python] ${arch}: 已存在 (${PY_VERSION}+${TAG})，跳过`,
		)
		return
	}

	const url = buildUrl(platform, arch)
	const tmpFile = path.join(os.tmpdir(), `python-${platform}-${arch}.tar.gz`)

	console.log(`[download-python] 下载 ${arch}: ${url}`)
	try {
		execSync(`curl -fSL --retry 3 -o "${tmpFile}" "${url}"`, {
			stdio: "inherit",
		})
	} catch {
		console.error(`[download-python] 下载失败: ${url}`)
		process.exit(1)
	}

	if (fs.existsSync(targetDir)) {
		fs.rmSync(targetDir, { recursive: true, force: true })
	}
	fs.mkdirSync(targetDir, { recursive: true })

	console.log(`[download-python] 解压到 ${targetDir}`)
	execSync(`tar xzf "${tmpFile}" --strip-components=1 -C "${targetDir}"`, {
		stdio: "inherit",
	})

	fs.unlinkSync(tmpFile)

	trimPython(targetDir)

	fs.writeFileSync(markerFile, `${PY_VERSION}+${TAG}\n`)
	console.log(`[download-python] ${arch}: 完成`)
}

function trimPython(dir) {
	let freedBytes = 0

	function removePath(p) {
		if (!fs.existsSync(p)) return
		const stat = fs.statSync(p)
		if (stat.isDirectory()) {
			freedBytes += dirSize(p)
			fs.rmSync(p, { recursive: true, force: true })
		} else {
			freedBytes += stat.size
			fs.unlinkSync(p)
		}
	}

	function dirSize(d) {
		let total = 0
		try {
			for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
				const full = path.join(d, entry.name)
				if (entry.isDirectory()) total += dirSize(full)
				else total += fs.statSync(full).size
			}
		} catch {}
		return total
	}

	function walkAndRemove(baseDir) {
		if (!fs.existsSync(baseDir)) return
		for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
			const full = path.join(baseDir, entry.name)
			if (DIRS_TO_TRIM.includes(entry.name)) {
				removePath(full)
			} else if (entry.isDirectory()) {
				walkAndRemove(full)
			} else if (entry.name.endsWith(".a") || entry.name.endsWith(".whl")) {
				removePath(full)
			}
		}
	}

	console.log("[download-python] 裁剪不需要的文件...")
	walkAndRemove(dir)
	const freedMB = (freedBytes / 1024 / 1024).toFixed(1)
	console.log(`[download-python] 裁剪完成，释放 ${freedMB} MB`)
}

function main() {
	const opts = parseArgs()
	const archs = getArchsToDownload(opts)
	const platform = process.platform

	console.log(`[download-python] 平台: ${platform}, 架构: ${archs.join(", ")}`)
	console.log(`[download-python] Python ${PY_VERSION}, 标签 ${TAG}`)

	for (const arch of archs) {
		downloadAndExtract(platform, arch)
	}
}

main()
