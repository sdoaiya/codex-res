export interface EnvironmentCandidate {
  id: string;
  product: "codex" | "cursor";
  rootPath: string;
  confidence: "low" | "medium" | "high";
  threadCount: number;
  recoverableThreadCount: number;
  issueCount: number;
  lastModifiedAt: string | null;
  artifacts: {
    configPath?: string;
    stateDbPath?: string;
    sessionsPath?: string;
    archivedSessionsPath?: string;
    transcriptsRootPath?: string;
  };
}

export interface DiagnosisIssue {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  threadId?: string;
}

export interface DiagnosisReport {
  candidateId: string;
  product: "codex" | "cursor";
  issues: DiagnosisIssue[];
  threadCount: number;
  recoverableThreadCount: number;
  backupRoot: string | null;
}

export interface RepairPlan {
  planId: string;
  candidateId: string;
  product: "codex" | "cursor";
  summary: {
    threadCount: number;
    sqliteUpdates: number;
    jsonlUpdates: number;
    restoreRollouts: number;
  };
}

export interface RepairResult {
  planId: string;
  product: "codex" | "cursor";
  verified: boolean;
  backupPath: string;
  summary: {
    updatedThreads: number;
    updatedJsonlFiles: number;
  };
}

export interface RestoreBackupResult {
  candidateId: string;
  product: "codex" | "cursor";
  restoredFrom: string;
}

export interface CodexCountRow {
  key: string;
  count: number;
}

export interface CodexBackupEntry {
  name: string;
  path: string;
  modifiedAt: string;
}

export interface CodexThreadStatus {
  id: string;
  title: string;
  provider: string;
  model: string;
  jsonlProvider: string;
  jsonlModel: string;
  cwd: string;
  archived: number;
  updatedAt: string | null;
  updatedAtMs: number;
  rolloutPath: string;
  existsInDb: boolean;
  existsInJsonl: boolean;
  syncCandidate: boolean;
  status: string[];
  jsonlPaths: string[];
}

export interface CodexStatusReport {
  candidateId: string;
  codexHome: string;
  configPath: string;
  dbPath: string;
  sessionsPath: string;
  archivedSessionsPath: string;
  sessionIndexPath: string;
  backupDir: string;
  deletedDir: string;
  currentProvider: string;
  currentModel: string | null;
  totalThreads: number;
  visibleThreads: number;
  movableThreads: number;
  providerMovableThreads: number;
  modelMovableThreads: number | null;
  jsonlMovableThreads: number;
  providerCounts: CodexCountRow[];
  modelCounts: CodexCountRow[];
  backups: CodexBackupEntry[];
  threads: CodexThreadStatus[];
}

export interface CodexSyncResult {
  selectedThreads: number;
  updatedRows: number;
  copiedArchivedJsonl: number;
  jsonlPatched: number;
  backupPath: string;
  beforeProviderCounts: CodexCountRow[];
  afterProviderCounts: CodexCountRow[];
  beforeModelCounts: CodexCountRow[];
  afterModelCounts: CodexCountRow[];
}

export interface CodexDeleteResult {
  dryRun: boolean;
  selectedThreads: number;
  matchedJsonlFiles: number;
  deletedDbRows: number;
  movedJsonlFiles: number;
  removedIndexRows: number;
  backupPath: string | null;
  deletedDir: string | null;
}

export interface CodexManualBackupResult {
  backupPath: string;
}

export interface CodexRestoreBackupResult {
  restoredFrom: string;
  safetyBackup: string;
}

export interface CodexTargetRequest {
  candidateId?: string;
}

export interface CodexSyncRequest extends CodexTargetRequest {
  threadIds?: string[];
  patchJsonlHeaders: boolean;
}

export interface CodexDeleteRequest extends CodexTargetRequest {
  threadIds: string[];
  dryRun?: boolean;
}

export interface CodexBackupRestoreRequest extends CodexTargetRequest {
  backupPath?: string;
}

export interface RestoreDesktopApi {
  scanEnvironments(): Promise<EnvironmentCandidate[]>;
  diagnoseEnvironment(candidateId: string): Promise<DiagnosisReport>;
  previewRepair(candidateId: string): Promise<RepairPlan>;
  applyRepair(planId: string): Promise<RepairResult>;
  restoreLatestBackup(candidateId: string): Promise<RestoreBackupResult>;
  openBackupFolder(candidateId: string): Promise<void>;
  codexStatus(request?: CodexTargetRequest): Promise<CodexStatusReport>;
  codexSync(request: CodexSyncRequest): Promise<CodexSyncResult>;
  codexDelete(request: CodexDeleteRequest): Promise<CodexDeleteResult>;
  codexBackupList(request?: CodexTargetRequest): Promise<CodexBackupEntry[]>;
  codexBackupCreate(request?: CodexTargetRequest): Promise<CodexManualBackupResult>;
  codexBackupRestore(request?: CodexBackupRestoreRequest): Promise<CodexRestoreBackupResult>;
  openCodexBackup(request?: CodexTargetRequest): Promise<void>;
  openCodexDeleted(request?: CodexTargetRequest): Promise<void>;
}

declare global {
  interface Window {
    restoreApp: RestoreDesktopApi;
  }
}
