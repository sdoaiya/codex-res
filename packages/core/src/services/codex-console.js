import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { scanEnvironments } from "./scan-environments.js";
const ROLLOUT_RE = /^rollout-(\d{4})-(\d{2})-(\d{2})T.*-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i;
const DB_BACKUP_RE = /^state_5\.sqlite\.[^.]+\.(\d{8}-\d{6})\.bak$/i;
function formatBackupTimestamp(date = new Date()) {
    const p = (value) => value.toString().padStart(2, "0");
    return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}
async function readText(filePath) {
    return fs.readFile(filePath, "utf8");
}
function createAtomicTempPath(filePath) {
    const token = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return path.join(path.dirname(filePath), `.${path.basename(filePath)}.${token}.tmp`);
}
async function atomicWriteText(filePath, content) {
    const tempPath = createAtomicTempPath(filePath);
    await fs.writeFile(tempPath, content, "utf8");
    try {
        await fs.rename(tempPath, filePath);
    }
    catch (error) {
        await fs.rm(tempPath, { force: true }).catch(() => { });
        throw error;
    }
}
function parseConfigValue(configText, key) {
    const match = configText.match(new RegExp(`^\\s*${key}\\s*=\\s*['"]([^'"]+)['"]`, "m"));
    return match ? match[1] : null;
}
function parseIsoToMs(value) {
    if (!value)
        return null;
    const asDate = new Date(value);
    const ms = asDate.getTime();
    return Number.isNaN(ms) ? null : ms;
}
function toIso(ms) {
    if (ms === null)
        return null;
    return new Date(ms).toISOString();
}
function cleanText(value, limit = 120) {
    if (!value)
        return "";
    const collapsed = value.replace(/\s+/g, " ").trim();
    if (collapsed.length <= limit)
        return collapsed;
    return `${collapsed.slice(0, limit - 1).trimEnd()}…`;
}
function normalizeCwd(value) {
    if (!value)
        return "";
    const prefix = "\\\\?\\";
    return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}
function extractFirstUserText(payload) {
    if (typeof payload !== "object" || payload === null)
        return "";
    const body = payload;
    const content = body.content;
    if (typeof content === "string")
        return content;
    if (!Array.isArray(content))
        return "";
    const parts = [];
    for (const item of content) {
        if (typeof item === "object" && item !== null) {
            const text = item.text;
            if (typeof text === "string")
                parts.push(text);
        }
    }
    return parts.join("\n");
}
function isRealUserMessage(text) {
    const trimmed = text.trim();
    return trimmed.length > 0 && !trimmed.startsWith("<environment_context>");
}
async function collectJsonlFiles(rootPath) {
    const stack = [rootPath];
    const output = [];
    while (stack.length > 0) {
        const current = stack.pop();
        let entries;
        try {
            entries = await fs.readdir(current, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(full);
            }
            else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
                output.push(full);
            }
        }
    }
    return output;
}
function sessionIdFromFilename(filePath) {
    const match = path.basename(filePath).match(ROLLOUT_RE);
    return match ? match[4] : null;
}
async function parseJsonlMeta(filePath) {
    let content;
    try {
        content = await readText(filePath);
    }
    catch {
        return null;
    }
    const lines = content.split(/\r?\n/);
    let firstMeta = null;
    let firstUser = "";
    let latestMs = null;
    for (const line of lines) {
        if (!line.trim())
            continue;
        let obj;
        try {
            obj = JSON.parse(line);
        }
        catch {
            continue;
        }
        const timestamp = typeof obj.timestamp === "string" ? obj.timestamp : null;
        const tsMs = parseIsoToMs(timestamp);
        if (tsMs !== null) {
            latestMs = latestMs === null ? tsMs : Math.max(latestMs, tsMs);
        }
        const type = typeof obj.type === "string" ? obj.type : "";
        const payload = obj.payload;
        if (type === "session_meta" && payload && typeof payload === "object" && firstMeta === null) {
            firstMeta = payload;
            continue;
        }
        if (type === "response_item" && payload && typeof payload === "object") {
            const payloadObj = payload;
            if (payloadObj.type === "message" && payloadObj.role === "user" && !firstUser) {
                const text = extractFirstUserText(payloadObj);
                if (isRealUserMessage(text))
                    firstUser = text;
            }
            continue;
        }
        if (type === "event_msg" && payload && typeof payload === "object" && !firstUser) {
            const payloadObj = payload;
            if (payloadObj.type === "user_message" && typeof payloadObj.message === "string") {
                if (isRealUserMessage(payloadObj.message))
                    firstUser = payloadObj.message;
            }
        }
    }
    const sid = (firstMeta && typeof firstMeta.id === "string" ? firstMeta.id : null) ??
        sessionIdFromFilename(filePath);
    if (!sid)
        return null;
    const createdMs = firstMeta && typeof firstMeta.timestamp === "string" ? parseIsoToMs(firstMeta.timestamp) : null;
    if (latestMs === null) {
        try {
            const stat = await fs.stat(filePath);
            latestMs = Math.round(stat.mtimeMs);
        }
        catch {
            latestMs = createdMs ?? Date.now();
        }
    }
    const provider = firstMeta && typeof firstMeta.model_provider === "string" ? firstMeta.model_provider : null;
    const model = firstMeta && typeof firstMeta.model === "string" ? firstMeta.model : null;
    const cwd = firstMeta && typeof firstMeta.cwd === "string" ? firstMeta.cwd : null;
    return {
        id: sid,
        path: filePath,
        provider,
        model,
        cwd,
        source: filePath.includes(`${path.sep}archived_sessions${path.sep}`) ? "archived_sessions" : "sessions",
        createdAtMs: createdMs,
        updatedAtMs: latestMs,
        title: cleanText(firstUser) || "New Conversation"
    };
}
async function collectJsonlMeta(paths) {
    const [sessionFiles, archivedFiles] = await Promise.all([
        collectJsonlFiles(paths.sessionsPath),
        collectJsonlFiles(paths.archivedSessionsPath)
    ]);
    const byId = new Map();
    for (const filePath of [...sessionFiles, ...archivedFiles]) {
        const meta = await parseJsonlMeta(filePath);
        if (!meta)
            continue;
        const rows = byId.get(meta.id);
        if (rows) {
            rows.push(meta);
        }
        else {
            byId.set(meta.id, [meta]);
        }
    }
    return byId;
}
function bestJsonlMeta(items) {
    if (!items || items.length === 0)
        return null;
    const sorted = [...items].sort((left, right) => {
        const leftSession = left.source === "sessions" ? 1 : 0;
        const rightSession = right.source === "sessions" ? 1 : 0;
        if (leftSession !== rightSession)
            return rightSession - leftSession;
        const leftMs = left.updatedAtMs ?? 0;
        const rightMs = right.updatedAtMs ?? 0;
        if (leftMs !== rightMs)
            return rightMs - leftMs;
        return left.path.localeCompare(right.path);
    });
    return sorted[0];
}
function getThreadColumns(db) {
    const rows = db.prepare("PRAGMA table_info(threads)").all();
    const names = new Set();
    for (const row of rows) {
        if (typeof row.name === "string")
            names.add(row.name);
    }
    return names;
}
function queryCounts(db, sql) {
    const rows = db.prepare(sql).all();
    return rows.map((row) => ({ key: row.value ?? "(empty)", count: Number(row.count ?? 0) }));
}
function threadStatusFromRow(id, row, meta, allMeta, currentProvider, currentModel) {
    const provider = (row && typeof row.model_provider === "string" ? row.model_provider : null) ?? meta?.provider ?? "";
    const model = (row && typeof row.model === "string" ? row.model : null) ?? meta?.model ?? "";
    const archived = Number(row?.archived ?? 0);
    const title = (row && typeof row.title === "string" ? cleanText(row.title) : null) ??
        meta?.title ??
        "New Conversation";
    let updatedAtMs = 0;
    if (row && typeof row.updated_at_ms === "number") {
        updatedAtMs = Math.round(row.updated_at_ms);
    }
    else if (row && typeof row.updated_at === "number") {
        updatedAtMs = Math.round(row.updated_at * 1000);
    }
    else if (meta?.updatedAtMs) {
        updatedAtMs = meta.updatedAtMs;
    }
    const jsonlProvider = meta?.provider ?? "";
    const jsonlModel = meta?.model ?? "";
    const dbMismatch = provider !== currentProvider || (!!currentModel && model !== currentModel) || archived !== 0;
    const jsonlMismatch = (!!jsonlProvider && jsonlProvider !== currentProvider) || (!!currentModel && !!jsonlModel && jsonlModel !== currentModel);
    const status = [];
    if (dbMismatch || jsonlMismatch)
        status.push("need-sync");
    if (archived !== 0)
        status.push("archived");
    if (!row)
        status.push("missing-db");
    if (!meta)
        status.push("missing-jsonl");
    if (status.length === 0)
        status.push("ok");
    return {
        id,
        title,
        provider,
        model,
        jsonlProvider,
        jsonlModel,
        cwd: normalizeCwd((row && typeof row.cwd === "string" ? row.cwd : null) ?? meta?.cwd ?? ""),
        archived,
        updatedAt: toIso(updatedAtMs || null),
        updatedAtMs,
        rolloutPath: row && typeof row.rollout_path === "string" ? row.rollout_path : "",
        existsInDb: !!row,
        existsInJsonl: !!meta,
        syncCandidate: dbMismatch || jsonlMismatch,
        status,
        jsonlPaths: (allMeta ?? []).map((item) => item.path)
    };
}
async function resolveCodexPaths(options, candidateId) {
    const candidates = await scanEnvironments(options);
    const codexCandidate = candidateId
        ? candidates.find((item) => item.id === candidateId && item.product === "codex")
        : candidates.find((item) => item.product === "codex");
    let candidate = codexCandidate ?? null;
    if (!candidate) {
        const codexHome = path.join(options.userHome, ".codex");
        candidate = {
            id: `codex::${codexHome}`,
            product: "codex",
            rootPath: codexHome,
            confidence: "low",
            threadCount: 0,
            recoverableThreadCount: 0,
            issueCount: 0,
            lastModifiedAt: null,
            artifacts: {
                configPath: path.join(codexHome, "config.toml"),
                stateDbPath: path.join(codexHome, "state_5.sqlite"),
                sessionsPath: path.join(codexHome, "sessions"),
                archivedSessionsPath: path.join(codexHome, "archived_sessions")
            }
        };
    }
    const codexHome = candidate.rootPath;
    const configPath = candidate.artifacts.configPath ?? path.join(codexHome, "config.toml");
    const dbPath = candidate.artifacts.stateDbPath ?? path.join(codexHome, "state_5.sqlite");
    const sessionsPath = candidate.artifacts.sessionsPath ?? path.join(codexHome, "sessions");
    const archivedSessionsPath = candidate.artifacts.archivedSessionsPath ?? path.join(codexHome, "archived_sessions");
    return {
        candidateId: candidate.id,
        codexHome,
        configPath,
        dbPath,
        sessionsPath,
        archivedSessionsPath,
        sessionIndexPath: path.join(codexHome, "session_index.jsonl"),
        backupDir: path.join(codexHome, "history_sync_backups"),
        restoreBackupDir: path.join(codexHome, "history_restore_backups"),
        deletedDir: path.join(codexHome, "history_sync_deleted")
    };
}
async function readCurrentConfig(paths) {
    const configText = await readText(paths.configPath);
    const provider = parseConfigValue(configText, "model_provider");
    if (!provider) {
        throw new Error(`Missing model_provider in config: ${paths.configPath}`);
    }
    return { provider, model: parseConfigValue(configText, "model") };
}
function ensureInsideCodexHome(filePath, codexHome) {
    const resolved = path.resolve(filePath);
    const parent = path.resolve(codexHome);
    return resolved === parent || resolved.startsWith(`${parent}${path.sep}`);
}
async function ensureJsonlInSessions(paths, threadIds, jsonlById) {
    const rolloutPaths = new Map();
    let copied = 0;
    for (const threadId of threadIds) {
        const metas = jsonlById.get(threadId) ?? [];
        const sessionMeta = metas.find((item) => item.source === "sessions" && fsSync.existsSync(item.path));
        if (sessionMeta) {
            rolloutPaths.set(threadId, sessionMeta.path);
            continue;
        }
        const archivedMeta = metas.find((item) => item.source === "archived_sessions" && fsSync.existsSync(item.path));
        if (!archivedMeta)
            continue;
        const nameMatch = path.basename(archivedMeta.path).match(ROLLOUT_RE);
        let year = `${new Date().getUTCFullYear()}`;
        let month = `${new Date().getUTCMonth() + 1}`.padStart(2, "0");
        let day = `${new Date().getUTCDate()}`.padStart(2, "0");
        if (nameMatch) {
            year = nameMatch[1];
            month = nameMatch[2];
            day = nameMatch[3];
        }
        else if (archivedMeta.createdAtMs) {
            const dt = new Date(archivedMeta.createdAtMs);
            year = `${dt.getUTCFullYear()}`;
            month = `${dt.getUTCMonth() + 1}`.padStart(2, "0");
            day = `${dt.getUTCDate()}`.padStart(2, "0");
        }
        const destination = path.join(paths.sessionsPath, year, month, day, path.basename(archivedMeta.path));
        if (!fsSync.existsSync(destination)) {
            await fs.mkdir(path.dirname(destination), { recursive: true });
            await fs.copyFile(archivedMeta.path, destination);
            copied += 1;
        }
        rolloutPaths.set(threadId, destination);
    }
    return { copied, rolloutPaths };
}
async function backupJsonlFile(paths, jsonlPath, label) {
    const timestamp = formatBackupTimestamp();
    const relative = ensureInsideCodexHome(jsonlPath, paths.codexHome)
        ? path.relative(paths.codexHome, jsonlPath).split(path.sep).join("__")
        : path.basename(jsonlPath);
    const destination = path.join(paths.backupDir, "jsonl", `${relative}.${label}.${timestamp}.bak`);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(jsonlPath, destination);
}
async function patchJsonlHeader(paths, jsonlPath, provider, model) {
    let content;
    try {
        content = await readText(jsonlPath);
    }
    catch {
        return false;
    }
    const lines = content.split(/\r?\n/);
    let changed = false;
    let patched = false;
    for (let index = 0; index < lines.length; index += 1) {
        const raw = lines[index];
        if (!raw || !raw.trim())
            continue;
        let obj;
        try {
            obj = JSON.parse(raw);
        }
        catch {
            continue;
        }
        if (obj.type !== "session_meta" || typeof obj.payload !== "object" || obj.payload === null) {
            continue;
        }
        const payload = obj.payload;
        patched = true;
        if (payload.model_provider !== provider) {
            payload.model_provider = provider;
            changed = true;
        }
        if (model && payload.model !== model) {
            payload.model = model;
            changed = true;
        }
        if (changed) {
            lines[index] = JSON.stringify(obj);
        }
        break;
    }
    if (!patched || !changed)
        return false;
    await backupJsonlFile(paths, jsonlPath, "pre-provider-patch");
    const tmpPath = `${jsonlPath}.tmp`;
    await fs.writeFile(tmpPath, `${lines.join("\n")}\n`, "utf8");
    await fs.rename(tmpPath, jsonlPath);
    return true;
}
async function makeDbBackup(paths, label) {
    await fs.mkdir(paths.backupDir, { recursive: true });
    const backupPath = path.join(paths.backupDir, `state_5.sqlite.${label}.${formatBackupTimestamp()}.bak`);
    await fs.copyFile(paths.dbPath, backupPath);
    return backupPath;
}
function queryThreadRows(db) {
    const rows = db.prepare("SELECT * FROM threads").all();
    const byId = new Map();
    for (const row of rows) {
        const id = typeof row.id === "string" ? row.id : null;
        if (id)
            byId.set(id, row);
    }
    return byId;
}
export async function listCodexBackups(options) {
    const paths = await resolveCodexPaths(options, options.candidateId);
    const roots = [paths.backupDir, paths.restoreBackupDir];
    const entries = [];
    for (const root of roots) {
        let files;
        try {
            files = await fs.readdir(root);
        }
        catch {
            continue;
        }
        for (const name of files) {
            if (!name.endsWith(".bak"))
                continue;
            const fullPath = path.join(root, name);
            try {
                const stat = await fs.stat(fullPath);
                entries.push({
                    name,
                    path: fullPath,
                    modifiedAt: new Date(stat.mtimeMs).toISOString()
                });
            }
            catch {
                continue;
            }
        }
    }
    entries.sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt));
    return entries;
}
export async function getCodexStatus(options) {
    const paths = await resolveCodexPaths(options, options.candidateId);
    const config = await readCurrentConfig(paths);
    const jsonlById = await collectJsonlMeta(paths);
    const db = new DatabaseSync(paths.dbPath, { open: true, readOnly: true });
    const columns = getThreadColumns(db);
    const rowsById = queryThreadRows(db);
    const providerCounts = queryCounts(db, "SELECT model_provider AS value, COUNT(*) AS count FROM threads GROUP BY model_provider ORDER BY COUNT(*) DESC, model_provider ASC");
    const modelCounts = columns.has("model")
        ? queryCounts(db, "SELECT model AS value, COUNT(*) AS count FROM threads GROUP BY model ORDER BY COUNT(*) DESC, model ASC")
        : [];
    db.close();
    const allIds = new Set([...rowsById.keys(), ...jsonlById.keys()]);
    const threads = [];
    for (const id of allIds) {
        const row = rowsById.get(id) ?? null;
        const allMeta = jsonlById.get(id);
        const meta = bestJsonlMeta(allMeta);
        threads.push(threadStatusFromRow(id, row, meta, allMeta, config.provider, config.model));
    }
    threads.sort((left, right) => {
        if (left.updatedAtMs !== right.updatedAtMs)
            return right.updatedAtMs - left.updatedAtMs;
        return left.id.localeCompare(right.id);
    });
    const totalThreads = rowsById.size;
    const visibleThreads = threads.filter((item) => item.provider === config.provider && item.archived === 0).length;
    const providerMovableThreads = threads.filter((item) => item.provider !== config.provider).length;
    const modelMovableThreads = config.model
        ? threads.filter((item) => item.model !== config.model).length
        : null;
    const jsonlMovableThreads = threads.filter((item) => (item.jsonlProvider && item.jsonlProvider !== config.provider) ||
        (!!config.model && !!item.jsonlModel && item.jsonlModel !== config.model)).length;
    const movableThreads = threads.filter((item) => item.syncCandidate).length;
    return {
        candidateId: paths.candidateId,
        codexHome: paths.codexHome,
        configPath: paths.configPath,
        dbPath: paths.dbPath,
        sessionsPath: paths.sessionsPath,
        archivedSessionsPath: paths.archivedSessionsPath,
        sessionIndexPath: paths.sessionIndexPath,
        backupDir: paths.backupDir,
        deletedDir: paths.deletedDir,
        currentProvider: config.provider,
        currentModel: config.model,
        totalThreads,
        visibleThreads,
        movableThreads,
        providerMovableThreads,
        modelMovableThreads,
        jsonlMovableThreads,
        providerCounts,
        modelCounts,
        backups: await listCodexBackups(options),
        threads
    };
}
export async function syncCodexThreads(options) {
    const paths = await resolveCodexPaths(options, options.candidateId);
    const status = await getCodexStatus({ ...options, candidateId: paths.candidateId });
    const selected = new Set(options.threadIds && options.threadIds.length > 0
        ? options.threadIds
        : status.threads.filter((item) => item.syncCandidate).map((item) => item.id));
    const backupPath = await makeDbBackup(paths, "pre-sync");
    const jsonlById = await collectJsonlMeta(paths);
    const { copied, rolloutPaths } = await ensureJsonlInSessions(paths, selected, jsonlById);
    const config = await readCurrentConfig(paths);
    const db = new DatabaseSync(paths.dbPath);
    const columns = getThreadColumns(db);
    const beforeProviderCounts = queryCounts(db, "SELECT model_provider AS value, COUNT(*) AS count FROM threads GROUP BY model_provider ORDER BY COUNT(*) DESC, model_provider ASC");
    const beforeModelCounts = columns.has("model")
        ? queryCounts(db, "SELECT model AS value, COUNT(*) AS count FROM threads GROUP BY model ORDER BY COUNT(*) DESC, model ASC")
        : [];
    const setParts = ["model_provider = ?"];
    const setParams = [config.provider];
    if (columns.has("model") && config.model) {
        setParts.push("model = ?");
        setParams.push(config.model);
    }
    if (columns.has("archived")) {
        setParts.push("archived = 0");
    }
    if (columns.has("archived_at")) {
        setParts.push("archived_at = NULL");
    }
    const updateSql = `UPDATE threads SET ${setParts.join(", ")} WHERE id = ?`;
    const updateStmt = db.prepare(updateSql);
    const rolloutStmt = columns.has("rollout_path") ? db.prepare("UPDATE threads SET rollout_path = ? WHERE id = ?") : null;
    let updatedRows = 0;
    for (const id of selected) {
        const changed = updateStmt.run(...setParams, id);
        updatedRows += Number(changed.changes ?? 0);
        if (rolloutStmt && rolloutPaths.has(id)) {
            rolloutStmt.run(rolloutPaths.get(id), id);
        }
    }
    const afterProviderCounts = queryCounts(db, "SELECT model_provider AS value, COUNT(*) AS count FROM threads GROUP BY model_provider ORDER BY COUNT(*) DESC, model_provider ASC");
    const afterModelCounts = columns.has("model")
        ? queryCounts(db, "SELECT model AS value, COUNT(*) AS count FROM threads GROUP BY model ORDER BY COUNT(*) DESC, model ASC")
        : [];
    db.close();
    let jsonlPatched = 0;
    if (options.patchJsonlHeaders) {
        for (const id of selected) {
            const metas = jsonlById.get(id) ?? [];
            for (const meta of metas) {
                const patched = await patchJsonlHeader(paths, meta.path, config.provider, config.model);
                if (patched)
                    jsonlPatched += 1;
            }
        }
    }
    return {
        selectedThreads: selected.size,
        updatedRows,
        copiedArchivedJsonl: copied,
        jsonlPatched,
        backupPath,
        beforeProviderCounts,
        afterProviderCounts,
        beforeModelCounts,
        afterModelCounts
    };
}
function createDeleteBatchDir(deletedRoot) {
    const stamp = formatBackupTimestamp().replace("-", "");
    return path.join(deletedRoot, stamp);
}
async function moveJsonlToDeleted(jsonlPath, paths, batchDir) {
    if (!fsSync.existsSync(jsonlPath) || !ensureInsideCodexHome(jsonlPath, paths.codexHome)) {
        return false;
    }
    const relative = path.relative(paths.codexHome, jsonlPath);
    let destination = path.join(batchDir, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    if (fsSync.existsSync(destination)) {
        const ext = path.extname(destination);
        const base = destination.slice(0, destination.length - ext.length);
        destination = `${base}.${Date.now()}${ext}`;
    }
    await fs.rename(jsonlPath, destination);
    return true;
}
async function removeFromSessionIndex(sessionIndexPath, deletedIds) {
    let content;
    try {
        content = await readText(sessionIndexPath);
    }
    catch {
        return 0;
    }
    const kept = [];
    let removed = 0;
    for (const line of content.split(/\r?\n/)) {
        if (!line.trim())
            continue;
        try {
            const obj = JSON.parse(line);
            if (typeof obj.id === "string" && deletedIds.has(obj.id)) {
                removed += 1;
                continue;
            }
            kept.push(line);
        }
        catch {
            kept.push(line);
        }
    }
    const tmpPath = `${sessionIndexPath}.tmp`;
    await fs.writeFile(tmpPath, kept.length > 0 ? `${kept.join("\n")}\n` : "", "utf8");
    await fs.rename(tmpPath, sessionIndexPath);
    return removed;
}
export async function deleteCodexThreads(options) {
    if (!options.threadIds || options.threadIds.length === 0) {
        throw new Error("No thread IDs selected for deletion.");
    }
    const paths = await resolveCodexPaths(options, options.candidateId);
    const status = await getCodexStatus({ ...options, candidateId: paths.candidateId });
    const selected = new Set(options.threadIds);
    const matchedJsonlFiles = status.threads
        .filter((item) => selected.has(item.id))
        .reduce((acc, item) => acc + item.jsonlPaths.length, 0);
    if (options.dryRun) {
        return {
            dryRun: true,
            selectedThreads: selected.size,
            matchedJsonlFiles,
            deletedDbRows: 0,
            movedJsonlFiles: 0,
            removedIndexRows: 0,
            backupPath: null,
            deletedDir: null
        };
    }
    const backupPath = await makeDbBackup(paths, "pre-delete");
    const batchDir = createDeleteBatchDir(paths.deletedDir);
    let movedJsonlFiles = 0;
    for (const thread of status.threads) {
        if (!selected.has(thread.id))
            continue;
        for (const jsonlPath of thread.jsonlPaths) {
            const moved = await moveJsonlToDeleted(jsonlPath, paths, batchDir);
            if (moved)
                movedJsonlFiles += 1;
        }
    }
    const db = new DatabaseSync(paths.dbPath);
    const placeholders = [...selected].map(() => "?").join(", ");
    const deleteResult = db
        .prepare(`DELETE FROM threads WHERE id IN (${placeholders})`)
        .run(...selected);
    db.close();
    const removedIndexRows = await removeFromSessionIndex(paths.sessionIndexPath, selected);
    return {
        dryRun: false,
        selectedThreads: selected.size,
        matchedJsonlFiles,
        deletedDbRows: Number(deleteResult.changes ?? 0),
        movedJsonlFiles,
        removedIndexRows,
        backupPath,
        deletedDir: batchDir
    };
}
export async function createCodexBackup(options) {
    const paths = await resolveCodexPaths(options, options.candidateId);
    return { backupPath: await makeDbBackup(paths, "manual") };
}
export async function restoreCodexBackup(options) {
    const paths = await resolveCodexPaths(options, options.candidateId);
    const backups = await listCodexBackups(options);
    const requestedPath = options.backupPath ?? backups[0]?.path;
    if (!requestedPath) {
        throw new Error("No backup available.");
    }
    if (!fsSync.existsSync(requestedPath)) {
        throw new Error(`Backup not found: ${requestedPath}`);
    }
    const safetyBackup = await makeDbBackup(paths, "pre-restore");
    await fs.copyFile(requestedPath, paths.dbPath);
    return {
        restoredFrom: requestedPath,
        safetyBackup
    };
}
