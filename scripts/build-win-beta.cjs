#!/usr/bin/env node
/**
 * 内测版 Windows 打包：安装包文件名带时间戳，应用内 version 保持 3.6.0
 * 输出: QuantclassClient-3.6.0-20250320143022.exe
 * 内核: v3.6.0（不变，便于匹配）
 */
const { spawnSync } = require("child_process");
const path = require("path");

const ts = new Date()
  .toISOString()
  .slice(0, 19)
  .replace(/[-:T]/g, "");
process.env.BUILD_TIMESTAMP = ts;
process.env.VITE_XBX_ENV = "production";

console.log("Building Windows beta, output filename suffix:", ts);

const rootDir = path.resolve(__dirname, "..");

if (process.platform === "win32") {
  spawnSync("chcp", ["65001"], { stdio: "inherit", cwd: rootDir, shell: true });
}

let result = spawnSync("node", [path.join(__dirname, "download-python.cjs")], {
  stdio: "inherit",
  env: process.env,
  cwd: rootDir,
  shell: true,
});
if (result.status !== 0) process.exit(result.status ?? 1);

result = spawnSync("pnpm", ["exec", "electron-vite", "build"], {
  stdio: "inherit",
  env: process.env,
  cwd: rootDir,
  shell: true,
});
if (result.status !== 0) process.exit(result.status ?? 1);

result = spawnSync(
  "pnpm",
  ["exec", "electron-builder", "--win", "-c", "electron-builder.beta.yml"],
  { stdio: "inherit", env: process.env, cwd: rootDir, shell: true }
);
process.exit(result.status ?? 0);
