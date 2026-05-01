export type ProductKind = "codex" | "cursor";

export type ConfidenceLevel = "low" | "medium" | "high";

export interface EnvironmentArtifacts {
  configPath?: string;
  stateDbPath?: string;
  sessionsPath?: string;
  archivedSessionsPath?: string;
  transcriptsRootPath?: string;
}

export interface EnvironmentCandidate {
  id: string;
  product: ProductKind;
  rootPath: string;
  confidence: ConfidenceLevel;
  threadCount: number;
  recoverableThreadCount: number;
  issueCount: number;
  lastModifiedAt: string | null;
  artifacts: EnvironmentArtifacts;
}

export interface ScanEnvironmentOptions {
  userHome: string;
  appDataRoaming: string;
}

export interface DiagnosisIssue {
  code:
    | "db-provider-mismatch"
    | "db-model-mismatch"
    | "jsonl-header-mismatch"
    | "archived-db-thread"
    | "transcript-only"
    | "composer-missing"
    | "checkpoint-missing"
    | "bubble-missing"
    | "unrecoverable";
  severity: "info" | "warning" | "error";
  message: string;
  threadId?: string;
}

export interface DiagnosisReport {
  candidateId: string;
  product: ProductKind;
  issues: DiagnosisIssue[];
  threadCount: number;
  recoverableThreadCount: number;
  backupRoot: string | null;
}

export interface PreviewRepairOptions extends ScanEnvironmentOptions {
  repairJsonlHeaders: boolean;
  restoreArchivedRollouts: boolean;
}

export interface RepairPlan {
  planId: string;
  candidateId: string;
  product: ProductKind;
  summary: {
    threadCount: number;
    sqliteUpdates: number;
    jsonlUpdates: number;
    restoreRollouts: number;
  };
}

export interface ApplyRepairOptions extends ScanEnvironmentOptions {}

export interface RepairResult {
  planId: string;
  product: ProductKind;
  verified: boolean;
  backupPath: string;
  summary: {
    updatedThreads: number;
    updatedJsonlFiles: number;
  };
}

export interface RestoreBackupResult {
  candidateId: string;
  product: ProductKind;
  restoredFrom: string;
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

export interface CodexCountRow {
  key: string;
  count: number;
}

export interface CodexBackupEntry {
  name: string;
  path: string;
  modifiedAt: string;
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

export interface CodexSyncOptions extends ScanEnvironmentOptions {
  candidateId?: string;
  threadIds?: string[];
  patchJsonlHeaders: boolean;
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

export interface CodexDeleteOptions extends ScanEnvironmentOptions {
  candidateId?: string;
  threadIds: string[];
  dryRun?: boolean;
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

export interface CodexManualBackupOptions extends ScanEnvironmentOptions {
  candidateId?: string;
}

export interface CodexManualBackupResult {
  backupPath: string;
}

export interface CodexBackupListOptions extends ScanEnvironmentOptions {
  candidateId?: string;
}

export interface CodexRestoreBackupOptions extends ScanEnvironmentOptions {
  candidateId?: string;
  backupPath?: string;
}

export interface CodexRestoreBackupResult {
  restoredFrom: string;
  safetyBackup: string;
}
