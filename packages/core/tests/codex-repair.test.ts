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

async function readText(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8");
}

export async function runCodexRepairTests(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "restore-codex-"));
  try {
    const codexHome = path.join(root, ".codex");
    const dbPath = path.join(codexHome, "state_5.sqlite");
    const sessionPath = path.join(
      codexHome,
      "sessions",
      "2026",
      "05",
      "01",
      "rollout-2026-05-01T12-00-00-11111111-1111-1111-1111-111111111111.jsonl"
    );

    await ensureFile(
      path.join(codexHome, "config.toml"),
      "model_provider = 'sub2api'\nmodel = 'gpt-5'\n"
    );
    createSqliteDb(dbPath, [
      "CREATE TABLE threads (id TEXT PRIMARY KEY, title TEXT, model_provider TEXT, model TEXT, archived INTEGER DEFAULT 0, cwd TEXT, updated_at_ms INTEGER, rollout_path TEXT);",
      "INSERT INTO threads (id, title, model_provider, model, archived, cwd, updated_at_ms, rollout_path) VALUES ('11111111-1111-1111-1111-111111111111', 'Old Thread', 'legacy', 'old-model', 1, 'C:\\repo', 1714564800000, '');"
    ]);
    await ensureFile(
      sessionPath,
      [
        '{"timestamp":"2026-05-01T12:00:00Z","type":"session_meta","payload":{"id":"11111111-1111-1111-1111-111111111111","model_provider":"legacy","model":"old-model","cwd":"C:\\\\repo"}}',
        '{"timestamp":"2026-05-01T12:01:00Z","type":"event_msg","payload":{"type":"user_message","message":"hello"}}'
      ].join("\n")
    );

    const scan = await scanEnvironments({
      userHome: root,
      appDataRoaming: path.join(root, "AppData", "Roaming")
    });
    const candidateId = scan[0].id;

    const report = await diagnoseEnvironment(candidateId, {
      userHome: root,
      appDataRoaming: path.join(root, "AppData", "Roaming")
    });

    assert.equal(report.product, "codex");
    assert.equal(report.recoverableThreadCount, 1);
    assert.deepEqual(
      report.issues.map((issue) => issue.code).sort(),
      ["archived-db-thread", "db-model-mismatch", "db-provider-mismatch", "jsonl-header-mismatch"].sort()
    );

    const plan = await previewRepair(candidateId, {
      userHome: root,
      appDataRoaming: path.join(root, "AppData", "Roaming"),
      repairJsonlHeaders: true,
      restoreArchivedRollouts: true
    });

    assert.equal(plan.product, "codex");
    assert.equal(plan.summary.threadCount, 1);
    assert.equal(plan.summary.sqliteUpdates, 1);
    assert.equal(plan.summary.jsonlUpdates, 1);

    const result = await applyRepair(plan.planId, {
      userHome: root,
      appDataRoaming: path.join(root, "AppData", "Roaming")
    });

    assert.equal(result.product, "codex");
    assert.equal(result.verified, true);
    assert.equal(result.summary.updatedThreads, 1);

    const db = new DatabaseSync(dbPath, { open: true, readOnly: true });
    const row = db
      .prepare("SELECT model_provider, model, archived FROM threads WHERE id = ?")
      .get("11111111-1111-1111-1111-111111111111") as Record<string, unknown>;
    db.close();

    assert.equal(row.model_provider, "sub2api");
    assert.equal(row.model, "gpt-5");
    assert.equal(row.archived, 0);

    const patchedJsonl = await readText(sessionPath);
    assert.match(patchedJsonl, /"model_provider":"sub2api"/);
    assert.match(patchedJsonl, /"model":"gpt-5"/);

    const restoreResult = await restoreLatestBackup(candidateId, {
      userHome: root,
      appDataRoaming: path.join(root, "AppData", "Roaming")
    });

    assert.equal(restoreResult.product, "codex");

    const restoredDb = new DatabaseSync(dbPath, { open: true, readOnly: true });
    const restoredRow = restoredDb
      .prepare("SELECT model_provider, model, archived FROM threads WHERE id = ?")
      .get("11111111-1111-1111-1111-111111111111") as Record<string, unknown>;
    restoredDb.close();
    assert.equal(restoredRow.model_provider, "legacy");
    assert.equal(restoredRow.model, "old-model");
    assert.equal(restoredRow.archived, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}
