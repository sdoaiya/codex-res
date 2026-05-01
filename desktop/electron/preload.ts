import { contextBridge, ipcRenderer } from "electron";
import type { RestoreDesktopApi } from "../src/types.ts";

const restoreAppApi: RestoreDesktopApi = {
  scanEnvironments: () => ipcRenderer.invoke("env.scan"),
  diagnoseEnvironment: (candidateId: string) => ipcRenderer.invoke("env.diagnose", candidateId),
  previewRepair: (candidateId: string) => ipcRenderer.invoke("repair.preview", candidateId),
  applyRepair: (planId: string) => ipcRenderer.invoke("repair.apply", planId),
  restoreLatestBackup: (candidateId: string) => ipcRenderer.invoke("backup.restoreLatest", candidateId),
  openBackupFolder: (candidateId: string) => ipcRenderer.invoke("backup.openFolder", candidateId),
  codexStatus: (request) => ipcRenderer.invoke("codex.status", request),
  codexSync: (request) => ipcRenderer.invoke("codex.sync", request),
  codexDelete: (request) => ipcRenderer.invoke("codex.delete", request),
  codexBackupList: (request) => ipcRenderer.invoke("codex.backup-list", request),
  codexBackupCreate: (request) => ipcRenderer.invoke("codex.backup-create", request),
  codexBackupRestore: (request) => ipcRenderer.invoke("codex.backup-restore", request),
  openCodexBackup: (request) => ipcRenderer.invoke("codex.open-backup", request),
  openCodexDeleted: (request) => ipcRenderer.invoke("codex.open-deleted", request)
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld("restoreApp", restoreAppApi);
} else {
  (globalThis as typeof globalThis & { restoreApp: RestoreDesktopApi }).restoreApp = restoreAppApi;
}
