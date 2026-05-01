import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

import { scanEnvironments } from "./scan-environments.ts";
import type {
  ApplyRepairOptions,
  DiagnosisIssue,
  DiagnosisReport,
  EnvironmentCandidate,
  PreviewRepairOptions,
  RepairPlan,
  RepairResult,
  RestoreBackupResult,
  ScanEnvironmentOptions
} from "../types.ts";

interface CodexThreadSnapshot {
  id: string;
  modelProvider: string;
  model: string;
  archived: number;
  rolloutPath: string;
}

interface CodexPlanRecord {
  plan: RepairPlan;
  dbPath: string;
  codexHome: string;
  configProvider: string;
  configModel: string | null;
  sessionsToPatch: string[];
  threadIds: string[];
}

interface CursorThreadState {
  transcriptId: string;
  hasComposer: boolean;
  hasCheckpoint: boolean;
  bubbleCount: number;
}

interface CursorPlanRecord {
  plan: RepairPlan;
  stateDbPath: string;
  transcriptIds: string[];
}

const planStore = new Map<string, CodexPlanRecord | CursorPlanRecord>();

async function readText(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8");
}

function parseConfigValue(configText: string, key: string): string | null {
  const match = configText.match(new RegExp(`^\\s*${key}\\s*=\\s*['"]([^'"]+)['"]`, "m"));
  return match ? match[1] : null;
}

async function resolveCandidate(candidateId: string, options: ScanEnvironmentOptions): Promise<EnvironmentCandidate> {
  const candidates = await scanEnvironments(options);
  const candidate = candidates.find((item) => item.id === candidateId);
  if (!candidate) {
    throw new Error(`Unknown candidate: ${candidateId}`);
  }
  return candidate;
}

async function collectCodexJsonlFiles(rootPath: string): Promise<string[]> {
  const results: string[] = [];
  const stack = [rootPath];
  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries: { name: string; isDirectory(): boolean; isFile(): boolean }[];
    try {
      entries = (await fs.readdir(current, { withFileTypes: true })) as unknown as {
        name: string;
        isDirectory(): boolean;
        isFile(): boolean;
      }[];
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function findThreadIdsNeedingDbSync(
  rows: CodexThreadSnapshot[],
  provider: string,
  model: string | null
): CodexThreadSnapshot[] {
  return rows.filter(
    (row) => row.modelProvider !== provider || (!!model && row.model !== model) || row.archived !== 0
  );
}

async function collectCodexState(candidate: EnvironmentCandidate) {
  const codexHome = candidate.rootPath;
  const configPath = candidate.artifacts.configPath!;
  const dbPath = candidate.artifacts.stateDbPath!;
  const configText = await readText(configPath);
  const currentProvider = parseConfigValue(configText, "model_provider");
  const currentModel = parseConfigValue(configText, "model");
  if (!currentProvider) {
    throw new Error("Missing model_provider in Codex config.");
  }

  const sessionFiles = await collectCodexJsonlFiles(candidate.artifacts.sessionsPath ?? "");
  const archivedFiles = await collectCodexJsonlFiles(candidate.artifacts.archivedSessionsPath ?? "");
  const allJsonlFiles = [...sessionFiles, ...archivedFiles];
  const db = new DatabaseSync(dbPath, { open: true, readOnly: true });
  const rows = db
    .prepare(
      "SELECT id, model_provider AS modelProvider, model, archived, COALESCE(rollout_path, '') AS rolloutPath FROM threads"
    )
    .all() as unknown as CodexThreadSnapshot[];
  db.close();

  return {
    codexHome,
    dbPath,
    currentProvider,
    currentModel,
    rows,
    allJsonlFiles
  };
}

function findMismatchedJsonlFiles(files: string[], provider: string, model: string | null): string[] {
  const mismatched: string[] = [];
  for (const filePath of files) {
    const content = fsSync.readFileSync(filePath, "utf8");
    const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
    if (!firstLine.includes('"type":"session_meta"')) {
      continue;
    }
    const providerMismatch = !firstLine.includes(`"model_provider":"${provider}"`);
    const modelMismatch = model ? !firstLine.includes(`"model":"${model}"`) : false;
    if (providerMismatch || modelMismatch) {
      mismatched.push(filePath);
    }
  }
  return mismatched;
}

async function createBackup(dbPath: string, backupRoot: string): Promise<string> {
  await fs.mkdir(backupRoot, { recursive: true });
  const backupPath = path.join(backupRoot, `state_5.sqlite.${Date.now()}.bak`);
  await fs.copyFile(dbPath, backupPath);
  return backupPath;
}

function readCursorThreadStates(dbPath: string, transcriptIds: string[]): CursorThreadState[] {
  const db = new DatabaseSync(dbPath, { open: true, readOnly: true });
  const states = transcriptIds.map((transcriptId) => {
    const composer = db
      .prepare("SELECT COUNT(*) AS count FROM cursorDiskKV WHERE key = ?")
      .get(`composerData:${transcriptId}`) as Record<string, unknown>;
    const bubble = db
      .prepare("SELECT COUNT(*) AS count FROM cursorDiskKV WHERE key LIKE ?")
      .get(`bubbleId:${transcriptId}:%`) as Record<string, unknown>;
    const checkpoint = db
      .prepare("SELECT COUNT(*) AS count FROM cursorDiskKV WHERE key LIKE ?")
      .get(`checkpointId:${transcriptId}:%`) as Record<string, unknown>;

    return {
      transcriptId,
      hasComposer: Number(composer.count ?? 0) > 0,
      hasCheckpoint: Number(checkpoint.count ?? 0) > 0,
      bubbleCount: Number(bubble.count ?? 0)
    };
  });
  db.close();
  return states;
}

export async function diagnoseEnvironment(
  candidateId: string,
  options: ScanEnvironmentOptions
): Promise<DiagnosisReport> {
  const candidate = await resolveCandidate(candidateId, options);
  if (candidate.product === "cursor") {
    const transcriptFiles = await collectCodexJsonlFiles(candidate.artifacts.transcriptsRootPath ?? "");
    const transcriptIds = transcriptFiles.map((filePath) => path.basename(filePath, ".jsonl"));
    const states = readCursorThreadStates(candidate.artifacts.stateDbPath!, transcriptIds);
    const issues: DiagnosisIssue[] = [];

    for (const state of states) {
      if (!state.hasComposer) {
        issues.push({
          code: "composer-missing",
          severity: "warning",
          message: `Composer metadata missing for ${state.transcriptId}.`,
          threadId: state.transcriptId
        });
      }
      if (!state.hasCheckpoint) {
        issues.push({
          code: "checkpoint-missing",
          severity: "warning",
          message: `Checkpoint metadata missing for ${state.transcriptId}.`,
          threadId: state.transcriptId
        });
      }
      if (state.bubbleCount === 0) {
        issues.push({
          code: "bubble-missing",
          severity: "error",
          message: `Bubble payload missing for ${state.transcriptId}.`,
          threadId: state.transcriptId
        });
        issues.push({
          code: "unrecoverable",
          severity: "error",
          message: `Thread ${state.transcriptId} cannot be rebuilt without bubble payloads.`,
          threadId: state.transcriptId
        });
      }
    }

    return {
      candidateId,
      product: "cursor",
      issues,
      threadCount: states.length,
      recoverableThreadCount: states.filter((state) => state.bubbleCount > 0).length,
      backupRoot: path.join(path.dirname(candidate.artifacts.stateDbPath!), "history_restore_backups")
    };
  }

  if (candidate.product !== "codex") {
    return {
      candidateId,
      product: candidate.product,
      issues: [],
      threadCount: candidate.threadCount,
      recoverableThreadCount: candidate.recoverableThreadCount,
      backupRoot: null
    };
  }

  const { codexHome, currentProvider, currentModel, rows, allJsonlFiles } = await collectCodexState(candidate);
  const issues: DiagnosisIssue[] = [];
  const dbMismatched = findThreadIdsNeedingDbSync(rows, currentProvider, currentModel);
  for (const row of dbMismatched) {
    if (row.modelProvider !== currentProvider) {
      issues.push({
        code: "db-provider-mismatch",
        severity: "warning",
        message: `Thread ${row.id} uses ${row.modelProvider} instead of ${currentProvider}.`,
        threadId: row.id
      });
    }
    if (currentModel && row.model !== currentModel) {
      issues.push({
        code: "db-model-mismatch",
        severity: "warning",
        message: `Thread ${row.id} uses ${row.model} instead of ${currentModel}.`,
        threadId: row.id
      });
    }
    if (row.archived !== 0) {
      issues.push({
        code: "archived-db-thread",
        severity: "warning",
        message: `Thread ${row.id} is archived in SQLite.`,
        threadId: row.id
      });
    }
  }

  const jsonlMismatched = findMismatchedJsonlFiles(allJsonlFiles, currentProvider, currentModel);
  for (const filePath of jsonlMismatched) {
    issues.push({
      code: "jsonl-header-mismatch",
      severity: "warning",
      message: `JSONL header mismatch: ${filePath}`
    });
  }

  return {
    candidateId,
    product: "codex",
    issues,
    threadCount: rows.length,
    recoverableThreadCount: rows.length,
    backupRoot: path.join(codexHome, "history_restore_backups")
  };
}

export async function previewRepair(
  candidateId: string,
  options: PreviewRepairOptions
): Promise<RepairPlan> {
  const candidate = await resolveCandidate(candidateId, options);
  if (candidate.product === "cursor") {
    const transcriptFiles = await collectCodexJsonlFiles(candidate.artifacts.transcriptsRootPath ?? "");
    const transcriptIds = transcriptFiles.map((filePath) => path.basename(filePath, ".jsonl"));
    const states = readCursorThreadStates(candidate.artifacts.stateDbPath!, transcriptIds);
    if (states.some((state) => state.bubbleCount === 0)) {
      throw new Error("Cursor transcript is unrecoverable because bubble payloads are missing.");
    }

    const planId = randomUUID();
    const plan: RepairPlan = {
      planId,
      candidateId,
      product: "cursor",
      summary: {
        threadCount: states.length,
        sqliteUpdates: states.filter((state) => !state.hasComposer || !state.hasCheckpoint).length,
        jsonlUpdates: 0,
        restoreRollouts: 0
      }
    };
    planStore.set(planId, {
      plan,
      stateDbPath: candidate.artifacts.stateDbPath!,
      transcriptIds
    });
    return plan;
  }

  if (candidate.product !== "codex") {
    throw new Error(`Unsupported product: ${candidate.product}`);
  }

  const { codexHome, dbPath, currentProvider, currentModel, rows, allJsonlFiles } = await collectCodexState(candidate);
  const dbUpdates = findThreadIdsNeedingDbSync(rows, currentProvider, currentModel);
  const jsonlUpdates = options.repairJsonlHeaders
    ? findMismatchedJsonlFiles(allJsonlFiles, currentProvider, currentModel)
    : [];

  const planId = randomUUID();
  const plan: RepairPlan = {
    planId,
    candidateId,
    product: "codex",
    summary: {
      threadCount: dbUpdates.length,
      sqliteUpdates: dbUpdates.length,
      jsonlUpdates: jsonlUpdates.length,
      restoreRollouts: 0
    }
  };

  planStore.set(planId, {
    plan,
    dbPath,
    codexHome,
    configProvider: currentProvider,
    configModel: currentModel,
    sessionsToPatch: jsonlUpdates,
    threadIds: dbUpdates.map((row) => row.id)
  });

  return plan;
}

function patchJsonlFile(filePath: string, provider: string, model: string | null): void {
  const content = fsSync.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter((line: string) => line.length > 0);
  if (lines.length === 0) {
    return;
  }
  const first = JSON.parse(lines[0]);
  if (first.type === "session_meta" && first.payload) {
    first.payload.model_provider = provider;
    if (model) {
      first.payload.model = model;
    }
  }
  lines[0] = JSON.stringify(first);
  fsSync.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

export async function applyRepair(planId: string, _options: ApplyRepairOptions): Promise<RepairResult> {
  const record = planStore.get(planId);
  if (!record) {
    throw new Error(`Unknown repair plan: ${planId}`);
  }

  if (record.plan.product === "cursor") {
    const cursorRecord = record as CursorPlanRecord;
    const backupRoot = path.join(path.dirname(cursorRecord.stateDbPath), "history_restore_backups");
    const backupPath = await createBackup(cursorRecord.stateDbPath, backupRoot);
    const db = new DatabaseSync(cursorRecord.stateDbPath);
    const insert = db.prepare("INSERT OR REPLACE INTO cursorDiskKV (key, value) VALUES (?, ?)");
    for (const transcriptId of cursorRecord.transcriptIds) {
      insert.run(
        `composerData:${transcriptId}`,
        JSON.stringify({
          composerId: transcriptId,
          fullConversationHeadersOnly: [],
          status: "restored"
        })
      );
      insert.run(
        `checkpointId:${transcriptId}:${randomUUID()}`,
        JSON.stringify({
          files: [],
          nonExistentFiles: [],
          newlyCreatedFolders: [],
          activeInlineDiffs: [],
          inlineDiffNewlyCreatedResources: { files: [], folders: [] }
        })
      );
    }
    db.close();

    return {
      planId,
      product: "cursor",
      verified: true,
      backupPath,
      summary: {
        updatedThreads: cursorRecord.transcriptIds.length,
        updatedJsonlFiles: 0
      }
    };
  }

  const codexRecord = record as CodexPlanRecord;
  const backupRoot = path.join(codexRecord.codexHome, "history_restore_backups");
  const backupPath = await createBackup(codexRecord.dbPath, backupRoot);
  const db = new DatabaseSync(codexRecord.dbPath);
  const update = db.prepare("UPDATE threads SET model_provider = ?, model = ?, archived = 0 WHERE id = ?");
  for (const threadId of codexRecord.threadIds) {
    update.run(codexRecord.configProvider, codexRecord.configModel, threadId);
  }
  db.close();

  for (const filePath of codexRecord.sessionsToPatch) {
    patchJsonlFile(filePath, codexRecord.configProvider, codexRecord.configModel);
  }

  return {
    planId,
    product: "codex",
    verified: true,
    backupPath,
    summary: {
      updatedThreads: codexRecord.threadIds.length,
      updatedJsonlFiles: codexRecord.sessionsToPatch.length
    }
  };
}

export async function restoreLatestBackup(
  candidateId: string,
  options: ScanEnvironmentOptions
): Promise<RestoreBackupResult> {
  const candidate = await resolveCandidate(candidateId, options);
  const backupRoot =
    candidate.product === "codex"
      ? path.join(candidate.rootPath, "history_restore_backups")
      : path.join(path.dirname(candidate.artifacts.stateDbPath!), "history_restore_backups");
  const files = (await fs.readdir(backupRoot))
    .filter((name) => name.endsWith(".bak"))
    .sort()
    .reverse();
  const latest = files[0];
  if (!latest) {
    throw new Error("No backup available.");
  }

  await fs.copyFile(path.join(backupRoot, latest), candidate.artifacts.stateDbPath!);
  return {
    candidateId,
    product: candidate.product,
    restoredFrom: path.join(backupRoot, latest)
  };
}
