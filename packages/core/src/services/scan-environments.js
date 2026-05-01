import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
async function exists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
async function listJsonlFiles(rootPath) {
    if (!(await exists(rootPath))) {
        return [];
    }
    const results = [];
    const stack = [rootPath];
    while (stack.length > 0) {
        const current = stack.pop();
        const entries = await fs.readdir(current, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(fullPath);
            }
            else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
                results.push(fullPath);
            }
        }
    }
    return results;
}
async function getLastModifiedAt(paths) {
    const stats = await Promise.all(paths.map(async (filePath) => {
        try {
            return await fs.stat(filePath);
        }
        catch {
            return null;
        }
    }));
    const latest = stats
        .filter((stat) => stat !== null)
        .sort((left, right) => right.mtimeMs - left.mtimeMs)
        .at(0);
    return latest ? new Date(latest.mtimeMs).toISOString() : null;
}
async function scanCodexEnvironment(options) {
    const codexHome = path.join(options.userHome, ".codex");
    const configPath = path.join(codexHome, "config.toml");
    const stateDbPath = path.join(codexHome, "state_5.sqlite");
    const sessionsPath = path.join(codexHome, "sessions");
    const archivedSessionsPath = path.join(codexHome, "archived_sessions");
    if (!(await exists(configPath)) || !(await exists(stateDbPath))) {
        return [];
    }
    const sessionFiles = await listJsonlFiles(sessionsPath);
    const archivedFiles = await listJsonlFiles(archivedSessionsPath);
    const db = new DatabaseSync(stateDbPath, { open: true, readOnly: true });
    const countRow = db.prepare("SELECT COUNT(*) AS count FROM threads").get();
    const threadCount = Number(countRow?.count ?? 0);
    db.close();
    return [
        {
            id: `codex::${codexHome}`,
            product: "codex",
            rootPath: codexHome,
            confidence: sessionFiles.length > 0 ? "high" : "medium",
            threadCount,
            recoverableThreadCount: sessionFiles.length + archivedFiles.length > 0 ? threadCount : 0,
            issueCount: 0,
            lastModifiedAt: await getLastModifiedAt([configPath, stateDbPath, ...sessionFiles]),
            artifacts: {
                configPath,
                stateDbPath,
                sessionsPath,
                archivedSessionsPath
            }
        }
    ];
}
function countCursorMetadata(dbPath, transcriptIds) {
    const db = new DatabaseSync(dbPath, { open: true, readOnly: true });
    const metadata = Object.fromEntries(transcriptIds.map((id) => [id, false]));
    for (const transcriptId of transcriptIds) {
        const composer = db
            .prepare("SELECT COUNT(*) AS count FROM cursorDiskKV WHERE key = ?")
            .get(`composerData:${transcriptId}`);
        const bubble = db
            .prepare("SELECT COUNT(*) AS count FROM cursorDiskKV WHERE key LIKE ?")
            .get(`bubbleId:${transcriptId}:%`);
        const checkpoint = db
            .prepare("SELECT COUNT(*) AS count FROM cursorDiskKV WHERE key LIKE ?")
            .get(`checkpointId:${transcriptId}:%`);
        metadata[transcriptId] =
            Number(composer.count ?? 0) > 0 && Number(bubble.count ?? 0) > 0 && Number(checkpoint.count ?? 0) > 0;
    }
    db.close();
    return metadata;
}
async function scanCursorEnvironment(options) {
    const cursorRoot = path.join(options.userHome, ".cursor");
    const transcriptsRootPath = path.join(cursorRoot, "projects");
    const stateDbPath = path.join(options.appDataRoaming, "Cursor", "User", "globalStorage", "state.vscdb");
    if (!(await exists(transcriptsRootPath)) || !(await exists(stateDbPath))) {
        return [];
    }
    const transcriptFiles = await listJsonlFiles(transcriptsRootPath);
    const transcriptIds = transcriptFiles.map((filePath) => path.basename(filePath, ".jsonl"));
    if (transcriptIds.length === 0) {
        return [];
    }
    const metadata = countCursorMetadata(stateDbPath, transcriptIds);
    const recoverableThreadCount = transcriptIds.filter((id) => metadata[id]).length;
    return [
        {
            id: `cursor::${cursorRoot}`,
            product: "cursor",
            rootPath: cursorRoot,
            confidence: recoverableThreadCount > 0 ? "high" : "medium",
            threadCount: transcriptIds.length,
            recoverableThreadCount,
            issueCount: 0,
            lastModifiedAt: await getLastModifiedAt([stateDbPath, ...transcriptFiles]),
            artifacts: {
                stateDbPath,
                transcriptsRootPath
            }
        }
    ];
}
export async function scanEnvironments(options) {
    const [codexCandidates, cursorCandidates] = await Promise.all([
        scanCodexEnvironment(options),
        scanCursorEnvironment(options)
    ]);
    return [...codexCandidates, ...cursorCandidates];
}
