import path from "node:path";
import fs from "node:fs";

import { app, BrowserWindow, ipcMain, shell } from "electron";
import {
  applyRepair,
  createCodexBackup,
  deleteCodexThreads,
  diagnoseEnvironment,
  getCodexStatus,
  listCodexBackups,
  previewRepair,
  restoreCodexBackup,
  restoreLatestBackup,
  scanEnvironments,
  syncCodexThreads
} from "../../packages/core/src/index.ts";

const runtimeRoot = path.join(app.getPath("temp"), "codex-history-restore-runtime");
fs.mkdirSync(path.join(runtimeRoot, "session"), { recursive: true });
app.setPath("userData", runtimeRoot);
app.setPath("sessionData", path.join(runtimeRoot, "session"));
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
app.commandLine.appendSwitch("no-sandbox");
app.commandLine.appendSwitch("disable-features", "NetworkService,NetworkServiceSandbox");
app.disableHardwareAcceleration();

function getScanOptions() {
  return {
    userHome: app.getPath("home"),
    appDataRoaming: app.getPath("appData")
  };
}

interface CodexTargetPayload {
  candidateId?: string;
}

interface CodexSyncPayload extends CodexTargetPayload {
  threadIds?: string[];
  patchJsonlHeaders: boolean;
}

interface CodexDeletePayload extends CodexTargetPayload {
  threadIds: string[];
  dryRun?: boolean;
}

interface CodexRestoreBackupPayload extends CodexTargetPayload {
  backupPath?: string;
}

async function resolveCodexRootPath(candidateId?: string): Promise<string> {
  const candidates = await scanEnvironments(getScanOptions());
  const candidate = candidateId
    ? candidates.find((item) => item.id === candidateId && item.product === "codex")
    : candidates.find((item) => item.product === "codex");
  return candidate?.rootPath ?? path.join(app.getPath("home"), ".codex");
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1400,
    height: 920,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: false,
      nodeIntegration: false
    }
  });

  window.loadFile(path.join(app.getAppPath(), "index.html"));
}

ipcMain.handle("env.scan", async () => scanEnvironments(getScanOptions()));
ipcMain.handle("env.diagnose", async (_event, candidateId: string) =>
  diagnoseEnvironment(candidateId, getScanOptions())
);
ipcMain.handle("repair.preview", async (_event, candidateId: string) =>
  previewRepair(candidateId, {
    ...getScanOptions(),
    repairJsonlHeaders: true,
    restoreArchivedRollouts: true
  })
);
ipcMain.handle("repair.apply", async (_event, planId: string) => applyRepair(planId, getScanOptions()));
ipcMain.handle("backup.restoreLatest", async (_event, candidateId: string) =>
  restoreLatestBackup(candidateId, getScanOptions())
);
ipcMain.handle("backup.openFolder", async (_event, candidateId: string) => {
  const candidates = await scanEnvironments(getScanOptions());
  const candidate = candidates.find((item) => item.id === candidateId);
  if (!candidate) return;
  const backupRoot =
    candidate.product === "codex"
      ? path.join(candidate.rootPath, "history_restore_backups")
      : path.join(path.dirname(candidate.artifacts.stateDbPath ?? candidate.rootPath), "history_restore_backups");
  await shell.openPath(backupRoot);
});
ipcMain.handle("codex.status", async (_event, payload?: CodexTargetPayload) =>
  getCodexStatus({
    ...getScanOptions(),
    candidateId: payload?.candidateId
  })
);
ipcMain.handle("codex.sync", async (_event, payload: CodexSyncPayload) => {
  if (!payload || typeof payload.patchJsonlHeaders !== "boolean") {
    throw new Error("codex.sync requires patchJsonlHeaders boolean.");
  }
  return syncCodexThreads({
    ...getScanOptions(),
    candidateId: payload.candidateId,
    threadIds: payload.threadIds,
    patchJsonlHeaders: payload.patchJsonlHeaders
  });
});
ipcMain.handle("codex.delete", async (_event, payload: CodexDeletePayload) => {
  if (!payload || !Array.isArray(payload.threadIds)) {
    throw new Error("codex.delete requires threadIds array.");
  }
  return deleteCodexThreads({
    ...getScanOptions(),
    candidateId: payload.candidateId,
    threadIds: payload.threadIds,
    dryRun: payload.dryRun
  });
});
ipcMain.handle("codex.backup-list", async (_event, payload?: CodexTargetPayload) =>
  listCodexBackups({
    ...getScanOptions(),
    candidateId: payload?.candidateId
  })
);
ipcMain.handle("codex.backup-create", async (_event, payload?: CodexTargetPayload) =>
  createCodexBackup({
    ...getScanOptions(),
    candidateId: payload?.candidateId
  })
);
ipcMain.handle("codex.backup-restore", async (_event, payload?: CodexRestoreBackupPayload) =>
  restoreCodexBackup({
    ...getScanOptions(),
    candidateId: payload?.candidateId,
    backupPath: payload?.backupPath
  })
);
ipcMain.handle("codex.open-backup", async (_event, payload?: CodexTargetPayload) => {
  const codexRootPath = await resolveCodexRootPath(payload?.candidateId);
  await shell.openPath(path.join(codexRootPath, "history_sync_backups"));
});
ipcMain.handle("codex.open-deleted", async (_event, payload?: CodexTargetPayload) => {
  const codexRootPath = await resolveCodexRootPath(payload?.candidateId);
  await shell.openPath(path.join(codexRootPath, "history_sync_deleted"));
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
