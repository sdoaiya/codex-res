import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);

async function ensureElectronDist() {
  const electronRoot = path.resolve("..", "node_modules", "electron");
  const distPath = path.join(electronRoot, "dist");
  try {
    await fs.access(path.join(distPath, "electron.exe"));
    return distPath;
  } catch {
    const workspaceNodeModules = path.resolve("..", "node_modules");
    const { downloadArtifact } = require(path.join(workspaceNodeModules, "@electron", "get"));
    const extract = require(path.join(workspaceNodeModules, "extract-zip"));
    const electronPackage = require(path.join(electronRoot, "package.json"));
    const cacheRoot = path.resolve("..", ".electron-cache");
    const zipPath = await downloadArtifact({
      version: electronPackage.version,
      artifactName: "electron",
      platform: "win32",
      arch: process.arch,
      cacheRoot,
      checksums: require(path.join(electronRoot, "checksums.json"))
    });
    await extract(zipPath, { dir: distPath });
    await fs.writeFile(path.join(electronRoot, "path.txt"), "electron.exe", "utf8");
    await fs.access(path.join(distPath, "electron.exe"));
    return distPath;
  }
}

async function copyDirectory(source, target) {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(from, to);
    } else {
      await fs.copyFile(from, to);
    }
  }
}

async function removeWithRetry(targetPath, retries = 5, delayMs = 300) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      await fs.rm(targetPath, { recursive: true, force: true });
      return;
    } catch (error) {
      const code = error && typeof error === "object" ? error.code : "";
      if ((code === "EBUSY" || code === "EPERM" || code === "ENOTEMPTY") && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
}

async function main() {
  const desktopRoot = path.resolve(".");
  const distPath = await ensureElectronDist();
  const releaseRoot = path.join(desktopRoot, "release", "win-portable");
  const appRoot = path.join(releaseRoot, "resources", "app");

  await removeWithRetry(releaseRoot);
  await copyDirectory(distPath, releaseRoot);
  await fs.mkdir(appRoot, { recursive: true });
  await copyDirectory(path.join(desktopRoot, "dist"), path.join(appRoot, "dist"));
  await copyDirectory(path.join(desktopRoot, "dist-electron"), path.join(appRoot, "dist-electron"));
  await fs.copyFile(path.join(desktopRoot, "index.html"), path.join(appRoot, "index.html"));

  const pkg = {
    name: "codex-history-restore",
    version: "0.1.0",
    main: "dist-electron/desktop/electron/main.js"
  };
  await fs.writeFile(path.join(appRoot, "package.json"), JSON.stringify(pkg, null, 2), "utf8");
  await copyDirectory(path.resolve("..", "node_modules", "react"), path.join(appRoot, "node_modules", "react"));
  await copyDirectory(path.resolve("..", "node_modules", "react-dom"), path.join(appRoot, "node_modules", "react-dom"));
  await copyDirectory(path.resolve("..", "node_modules", "scheduler"), path.join(appRoot, "node_modules", "scheduler"));
  const safeLauncher = [
    "@echo off",
    "setlocal",
    "set \"SAFE_USER_DATA=%TEMP%\\codex-history-restore-runtime\"",
    "if not exist \"%SAFE_USER_DATA%\" mkdir \"%SAFE_USER_DATA%\"",
    "start \"\" \"%~dp0electron.exe\" --no-sandbox --disable-features=NetworkServiceSandbox --user-data-dir=\"%SAFE_USER_DATA%\"",
    "endlocal"
  ].join("\r\n");
  await fs.writeFile(path.join(releaseRoot, "Launch-Safe.bat"), `${safeLauncher}\r\n`, "utf8");
  console.log(`Portable app ready at ${releaseRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
