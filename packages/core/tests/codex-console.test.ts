import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  createCodexBackup,
  deleteCodexThreads,
  getCodexStatus,
  listCodexBackups,
  restoreCodexBackup,
  scanEnvironments,
  syncCodexThreads
} from "../src/index.ts";
import type { CodexCountRow } from "../src/index.ts";

async function ensureFile(filePath: string, content = ""): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

function createSqliteDb(filePath: string, statements: string[]): void {
  const db = new DatabaseSync(filePath);
  for (const statement of statements) {
    db.exec(statement);
  }
  db.close();
}

async function readText(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8");
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(rootPath: string): Promise<string[]> {
  const result: string[] = [];
  const stack = [rootPath];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        result.push(fullPath);
      }
    }
  }
  return result;
}

function countByKey(rows: CodexCountRow[], key: string): number {
  const hit = rows.find((item) => item.key === key);
  return hit ? hit.count : 0;
}

function readThreadRow(
  dbPath: string,
  threadId: string
): { model_provider: string; model: string; archived: number } | null {
  const db = new DatabaseSync(dbPath, { open: true, readOnly: true });
  const row = db
    .prepare("SELECT model_provider, model, archived FROM threads WHERE id = ?")
    .get(threadId) as { model_provider: string; model: string; archived: number } | undefined;
  db.close();
  return row ?? null;
}

async function writeSessionJsonl(
  codexHome: string,
  sessionRoot: "sessions" | "archived_sessions",
  date: string,
  threadId: string,
  provider: string,
  model: string,
  text: string
): Promise<string> {
  const [year, month, day] = date.split("-");
  const filePath = path.join(
    codexHome,
    sessionRoot,
    year,
    month,
    day,
    `rollout-${date}T12-00-00-${threadId}.jsonl`
  );
  await ensureFile(
    filePath,
    [
      JSON.stringify({
        timestamp: `${date}T12:00:00Z`,
        type: "session_meta",
        payload: {
          id: threadId,
          model_provider: provider,
          model,
          cwd: "C:\\repo\\demo"
        }
      }),
      JSON.stringify({
        timestamp: `${date}T12:01:00Z`,
        type: "event_msg",
        payload: {
          type: "user_message",
          message: text
        }
      })
    ].join("\n")
  );
  return filePath;
}

export async function runCodexConsoleTests(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "restore-codex-console-"));
  try {
    const codexHome = path.join(root, ".codex");
    const dbPath = path.join(codexHome, "state_5.sqlite");
    const appDataRoaming = path.join(root, "AppData", "Roaming");

    const selectedSyncId = "11111111-1111-1111-1111-111111111111";
    const unselectedSyncId = "22222222-2222-2222-2222-222222222222";
    const keepId = "33333333-3333-3333-3333-333333333333";
    const deleteId = "44444444-4444-4444-4444-444444444444";

    await ensureFile(
      path.join(codexHome, "config.toml"),
      "model_provider = 'sub2api'\nmodel = 'gpt-5'\n"
    );
    createSqliteDb(dbPath, [
      "CREATE TABLE threads (id TEXT PRIMARY KEY, title TEXT, model_provider TEXT, model TEXT, archived INTEGER DEFAULT 0, cwd TEXT, updated_at_ms INTEGER, rollout_path TEXT);",
      `INSERT INTO threads (id, title, model_provider, model, archived, cwd, updated_at_ms, rollout_path) VALUES ('${selectedSyncId}', 'Selected Sync', 'legacy', 'old-model', 1, 'C:\\repo\\selected', 1714564800000, '');`,
      `INSERT INTO threads (id, title, model_provider, model, archived, cwd, updated_at_ms, rollout_path) VALUES ('${unselectedSyncId}', 'Unselected Sync', 'legacy', 'old-model', 0, 'C:\\repo\\unselected', 1714568400000, '');`,
      `INSERT INTO threads (id, title, model_provider, model, archived, cwd, updated_at_ms, rollout_path) VALUES ('${keepId}', 'Keep Thread', 'sub2api', 'gpt-5', 0, 'C:\\repo\\keep', 1714572000000, '');`,
      `INSERT INTO threads (id, title, model_provider, model, archived, cwd, updated_at_ms, rollout_path) VALUES ('${deleteId}', 'Delete Thread', 'sub2api', 'gpt-5', 0, 'C:\\repo\\delete', 1714575600000, '');`
    ]);

    const selectedJsonlPath = await writeSessionJsonl(
      codexHome,
      "sessions",
      "2026-05-01",
      selectedSyncId,
      "legacy",
      "old-model",
      "selected sync message"
    );
    const unselectedJsonlPath = await writeSessionJsonl(
      codexHome,
      "sessions",
      "2026-05-01",
      unselectedSyncId,
      "legacy",
      "old-model",
      "unselected sync message"
    );
    await writeSessionJsonl(
      codexHome,
      "sessions",
      "2026-05-01",
      keepId,
      "sub2api",
      "gpt-5",
      "keep message"
    );
    const deleteJsonlPath = await writeSessionJsonl(
      codexHome,
      "sessions",
      "2026-05-01",
      deleteId,
      "sub2api",
      "gpt-5",
      "delete message"
    );

    await ensureFile(
      path.join(codexHome, "session_index.jsonl"),
      [
        JSON.stringify({ id: selectedSyncId, path: selectedJsonlPath }),
        JSON.stringify({ id: unselectedSyncId, path: unselectedJsonlPath }),
        JSON.stringify({ id: keepId, path: "keep-path" }),
        JSON.stringify({ id: deleteId, path: deleteJsonlPath })
      ].join("\n") + "\n"
    );

    const scan = await scanEnvironments({ userHome: root, appDataRoaming });
    const codexCandidate = scan.find((item) => item.product === "codex");
    assert.ok(codexCandidate);

    const status = await getCodexStatus({
      userHome: root,
      appDataRoaming,
      candidateId: codexCandidate.id
    });
    assert.equal(status.currentProvider, "sub2api");
    assert.equal(status.currentModel, "gpt-5");
    assert.equal(status.totalThreads, 4);
    assert.equal(status.visibleThreads, 2);
    assert.equal(status.movableThreads, 2);
    assert.equal(status.providerMovableThreads, 2);
    assert.equal(status.modelMovableThreads, 2);
    assert.equal(status.jsonlMovableThreads, 2);
    assert.equal(countByKey(status.providerCounts, "legacy"), 2);
    assert.equal(countByKey(status.providerCounts, "sub2api"), 2);

    const selectedBefore = status.threads.find((item) => item.id === selectedSyncId);
    assert.ok(selectedBefore);
    assert.equal(selectedBefore.archived, 1);
    assert.equal(selectedBefore.syncCandidate, true);

    const syncResult = await syncCodexThreads({
      userHome: root,
      appDataRoaming,
      candidateId: codexCandidate.id,
      threadIds: [selectedSyncId],
      patchJsonlHeaders: true
    });
    assert.equal(syncResult.selectedThreads, 1);
    assert.equal(syncResult.updatedRows, 1);
    assert.equal(syncResult.copiedArchivedJsonl, 0);
    assert.equal(syncResult.jsonlPatched, 1);
    assert.equal(countByKey(syncResult.beforeProviderCounts, "legacy"), 2);
    assert.equal(countByKey(syncResult.afterProviderCounts, "legacy"), 1);
    assert.equal(await pathExists(syncResult.backupPath), true);

    const selectedRow = readThreadRow(dbPath, selectedSyncId);
    const unselectedRow = readThreadRow(dbPath, unselectedSyncId);
    assert.ok(selectedRow);
    assert.ok(unselectedRow);
    assert.equal(selectedRow.model_provider, "sub2api");
    assert.equal(selectedRow.model, "gpt-5");
    assert.equal(selectedRow.archived, 0);
    assert.equal(unselectedRow.model_provider, "legacy");
    assert.equal(unselectedRow.model, "old-model");

    const selectedJsonl = await readText(selectedJsonlPath);
    const unselectedJsonl = await readText(unselectedJsonlPath);
    assert.match(selectedJsonl, /"model_provider":"sub2api"/);
    assert.match(selectedJsonl, /"model":"gpt-5"/);
    assert.match(unselectedJsonl, /"model_provider":"legacy"/);

    const dryRun = await deleteCodexThreads({
      userHome: root,
      appDataRoaming,
      candidateId: codexCandidate.id,
      threadIds: [unselectedSyncId, deleteId],
      dryRun: true
    });
    assert.equal(dryRun.dryRun, true);
    assert.equal(dryRun.selectedThreads, 2);
    assert.equal(dryRun.matchedJsonlFiles, 2);
    assert.equal(dryRun.deletedDbRows, 0);
    assert.equal(dryRun.movedJsonlFiles, 0);
    assert.equal(dryRun.removedIndexRows, 0);
    assert.equal(dryRun.backupPath, null);
    assert.equal(dryRun.deletedDir, null);
    assert.equal(await pathExists(unselectedJsonlPath), true);
    assert.equal(await pathExists(deleteJsonlPath), true);

    const deleteResult = await deleteCodexThreads({
      userHome: root,
      appDataRoaming,
      candidateId: codexCandidate.id,
      threadIds: [unselectedSyncId, deleteId]
    });
    assert.equal(deleteResult.dryRun, false);
    assert.equal(deleteResult.selectedThreads, 2);
    assert.equal(deleteResult.matchedJsonlFiles, 2);
    assert.equal(deleteResult.deletedDbRows, 2);
    assert.equal(deleteResult.movedJsonlFiles, 2);
    assert.equal(deleteResult.removedIndexRows, 2);
    assert.ok(deleteResult.backupPath);
    assert.ok(deleteResult.deletedDir);
    assert.equal(await pathExists(deleteResult.backupPath!), true);
    assert.equal(await pathExists(deleteResult.deletedDir!), true);
    assert.equal(await pathExists(unselectedJsonlPath), false);
    assert.equal(await pathExists(deleteJsonlPath), false);

    const deletedFiles = await collectFiles(deleteResult.deletedDir!);
    assert.ok(deletedFiles.some((item) => path.basename(item) === path.basename(unselectedJsonlPath)));
    assert.ok(deletedFiles.some((item) => path.basename(item) === path.basename(deleteJsonlPath)));

    const rowAfterDeleteA = readThreadRow(dbPath, unselectedSyncId);
    const rowAfterDeleteB = readThreadRow(dbPath, deleteId);
    assert.equal(rowAfterDeleteA, null);
    assert.equal(rowAfterDeleteB, null);

    const sessionIndex = await readText(path.join(codexHome, "session_index.jsonl"));
    assert.doesNotMatch(sessionIndex, new RegExp(unselectedSyncId));
    assert.doesNotMatch(sessionIndex, new RegExp(deleteId));
    assert.match(sessionIndex, new RegExp(keepId));

    const manualBackup = await createCodexBackup({
      userHome: root,
      appDataRoaming,
      candidateId: codexCandidate.id
    });
    assert.equal(await pathExists(manualBackup.backupPath), true);
    assert.match(path.basename(manualBackup.backupPath), /^state_5\.sqlite\.manual\./);

    const backups = await listCodexBackups({
      userHome: root,
      appDataRoaming,
      candidateId: codexCandidate.id
    });
    assert.ok(backups.some((item) => item.path === manualBackup.backupPath));

    const db = new DatabaseSync(dbPath);
    db.prepare("UPDATE threads SET model_provider = ?, model = ? WHERE id = ?").run(
      "broken-provider",
      "broken-model",
      selectedSyncId
    );
    db.close();

    const mutatedRow = readThreadRow(dbPath, selectedSyncId);
    assert.ok(mutatedRow);
    assert.equal(mutatedRow.model_provider, "broken-provider");

    const restoreResult = await restoreCodexBackup({
      userHome: root,
      appDataRoaming,
      candidateId: codexCandidate.id,
      backupPath: manualBackup.backupPath
    });
    assert.equal(restoreResult.restoredFrom, manualBackup.backupPath);
    assert.equal(await pathExists(restoreResult.safetyBackup), true);

    const restoredRow = readThreadRow(dbPath, selectedSyncId);
    assert.ok(restoredRow);
    assert.equal(restoredRow.model_provider, "sub2api");
    assert.equal(restoredRow.model, "gpt-5");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}
