import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { scanEnvironments } from "../src/index.ts";

export async function runScanEnvironmentTests(): Promise<void> {
  const tempRoots: string[] = [];

  async function makeTempRoot(): Promise<string> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "restore-scan-"));
    tempRoots.push(root);
    return root;
  }

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

  try {
    const root = await makeTempRoot();
    const codexHome = path.join(root, ".codex");

    await ensureFile(
      path.join(codexHome, "config.toml"),
      "model_provider = 'sub2api'\nmodel = 'gpt-5'\n"
    );
    createSqliteDb(path.join(codexHome, "state_5.sqlite"), [
      "CREATE TABLE threads (id TEXT PRIMARY KEY, model_provider TEXT, model TEXT, archived INTEGER DEFAULT 0);",
      "INSERT INTO threads (id, model_provider, model, archived) VALUES ('thread-1', 'legacy', 'old-model', 0);"
    ]);
    await ensureFile(
      path.join(codexHome, "sessions", "2026", "05", "01", "rollout-2026-05-01T12-00-00-11111111-1111-1111-1111-111111111111.jsonl"),
      [
        '{"timestamp":"2026-05-01T12:00:00Z","type":"session_meta","payload":{"id":"11111111-1111-1111-1111-111111111111","model_provider":"legacy","model":"old-model","cwd":"C:\\\\repo"}}',
        '{"timestamp":"2026-05-01T12:01:00Z","type":"event_msg","payload":{"type":"user_message","message":"hello"}}'
      ].join("\n")
    );

    const codexResult = await scanEnvironments({
      userHome: root,
      appDataRoaming: path.join(root, "AppData", "Roaming")
    });

    assert.equal(codexResult.length, 1);
    assert.deepEqual(
      {
        id: codexResult[0].id,
        product: codexResult[0].product,
        rootPath: codexResult[0].rootPath,
        confidence: codexResult[0].confidence,
        threadCount: codexResult[0].threadCount,
        recoverableThreadCount: codexResult[0].recoverableThreadCount
      },
      {
      id: "codex::" + codexHome,
      product: "codex",
      rootPath: codexHome,
      confidence: "high",
      threadCount: 1,
        recoverableThreadCount: 1
      }
    );

    const cursorRoot = await makeTempRoot();
    const cursorProjects = path.join(cursorRoot, ".cursor", "projects", "demo-project", "agent-transcripts");
    const transcriptId = "722187e1-e0df-4776-8de6-76c139363531";
    const transcriptPath = path.join(cursorProjects, transcriptId, `${transcriptId}.jsonl`);
    const statePath = path.join(cursorRoot, "AppData", "Roaming", "Cursor", "User", "globalStorage", "state.vscdb");

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
      `INSERT INTO cursorDiskKV (key, value) VALUES ('composerData:${transcriptId}', '{"composerId":"${transcriptId}","fullConversationHeadersOnly":[{"bubbleId":"bubble-1","type":1}],"status":"done"}');`,
      `INSERT INTO cursorDiskKV (key, value) VALUES ('bubbleId:${transcriptId}:bubble-1', '{"bubbleId":"bubble-1","type":1}');`,
      `INSERT INTO cursorDiskKV (key, value) VALUES ('checkpointId:${transcriptId}:checkpoint-1', '{"files":[]}');`
    ]);

    const result = await scanEnvironments({
      userHome: cursorRoot,
      appDataRoaming: path.join(cursorRoot, "AppData", "Roaming")
    });

    assert.equal(result.length, 1);
    assert.equal(result[0].product, "cursor");
    assert.equal(result[0].confidence, "high");
    assert.equal(result[0].threadCount, 1);
    assert.equal(result[0].recoverableThreadCount, 1);
    assert.equal(result[0].artifacts.stateDbPath, statePath);
    assert.match(result[0].rootPath, new RegExp("\\.cursor"));
  } finally {
    await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  }
}
