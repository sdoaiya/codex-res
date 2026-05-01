import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  applyRepair,
  diagnoseEnvironment,
  previewRepair,
  restoreLatestBackup,
  scanEnvironments
} from "../src/index.ts";

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

export async function runCursorRepairTests(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "restore-cursor-"));
  try {
    const transcriptId = "722187e1-e0df-4776-8de6-76c139363531";
    const transcriptPath = path.join(
      root,
      ".cursor",
      "projects",
      "demo-project",
      "agent-transcripts",
      transcriptId,
      `${transcriptId}.jsonl`
    );
    const statePath = path.join(root, "AppData", "Roaming", "Cursor", "User", "globalStorage", "state.vscdb");

    await ensureFile(
      transcriptPath,
      [
        '{"role":"user","message":{"content":[{"type":"text","text":"hello"}]}}',
        '{"role":"assistant","message":{"content":[{"type":"text","text":"world"}]}}'
      ].join("\n")
    );

    await fs.mkdir(path.dirname(statePath), { recursive: true });
    createSqliteDb(statePath, [
      "CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT);",
      "CREATE TABLE cursorDiskKV (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB);",
      `INSERT INTO cursorDiskKV (key, value) VALUES ('bubbleId:${transcriptId}:bubble-1', '{"bubbleId":"bubble-1","type":1}');`
    ]);

    const scan = await scanEnvironments({
      userHome: root,
      appDataRoaming: path.join(root, "AppData", "Roaming")
    });
    const candidateId = scan[0].id;

    const report = await diagnoseEnvironment(candidateId, {
      userHome: root,
      appDataRoaming: path.join(root, "AppData", "Roaming")
    });

    assert.equal(report.product, "cursor");
    assert.deepEqual(
      report.issues.map((issue) => issue.code).sort(),
      ["checkpoint-missing", "composer-missing"].sort()
    );

    const plan = await previewRepair(candidateId, {
      userHome: root,
      appDataRoaming: path.join(root, "AppData", "Roaming"),
      repairJsonlHeaders: true,
      restoreArchivedRollouts: true
    });

    assert.equal(plan.product, "cursor");
    assert.equal(plan.summary.threadCount, 1);

    const result = await applyRepair(plan.planId, {
      userHome: root,
      appDataRoaming: path.join(root, "AppData", "Roaming")
    });

    assert.equal(result.product, "cursor");
    assert.equal(result.verified, true);

    const db = new DatabaseSync(statePath, { open: true, readOnly: true });
    const composerCount = db
      .prepare("SELECT COUNT(*) AS count FROM cursorDiskKV WHERE key = ?")
      .get(`composerData:${transcriptId}`) as Record<string, unknown>;
    const checkpointCount = db
      .prepare("SELECT COUNT(*) AS count FROM cursorDiskKV WHERE key LIKE ?")
      .get(`checkpointId:${transcriptId}:%`) as Record<string, unknown>;
    db.close();

    assert.equal(composerCount.count, 1);
    assert.equal(checkpointCount.count, 1);

    const restoreResult = await restoreLatestBackup(candidateId, {
      userHome: root,
      appDataRoaming: path.join(root, "AppData", "Roaming")
    });
    assert.equal(restoreResult.product, "cursor");

    const restoredDb = new DatabaseSync(statePath, { open: true, readOnly: true });
    const restoredComposerCount = restoredDb
      .prepare("SELECT COUNT(*) AS count FROM cursorDiskKV WHERE key = ?")
      .get(`composerData:${transcriptId}`) as Record<string, unknown>;
    restoredDb.close();
    assert.equal(restoredComposerCount.count, 0);

    const unrecoverableRoot = await fs.mkdtemp(path.join(os.tmpdir(), "restore-cursor-dead-"));
    try {
      const stateOnlyPath = path.join(
        unrecoverableRoot,
        "AppData",
        "Roaming",
        "Cursor",
        "User",
        "globalStorage",
        "state.vscdb"
      );
      const unrecoverableTranscript = path.join(
        unrecoverableRoot,
        ".cursor",
        "projects",
        "demo-project",
        "agent-transcripts",
        transcriptId,
        `${transcriptId}.jsonl`
      );
      await ensureFile(unrecoverableTranscript, '{"role":"user","message":{"content":[{"type":"text","text":"orphan"}]}}');
      await fs.mkdir(path.dirname(stateOnlyPath), { recursive: true });
      createSqliteDb(stateOnlyPath, [
        "CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT);",
        "CREATE TABLE cursorDiskKV (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB);"
      ]);

      const deadScan = await scanEnvironments({
        userHome: unrecoverableRoot,
        appDataRoaming: path.join(unrecoverableRoot, "AppData", "Roaming")
      });
      const deadReport = await diagnoseEnvironment(deadScan[0].id, {
        userHome: unrecoverableRoot,
        appDataRoaming: path.join(unrecoverableRoot, "AppData", "Roaming")
      });
      assert.deepEqual(
        deadReport.issues.map((issue) => issue.code).sort(),
        ["bubble-missing", "checkpoint-missing", "composer-missing", "unrecoverable"].sort()
      );
    } finally {
      await fs.rm(unrecoverableRoot, { recursive: true, force: true });
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}
