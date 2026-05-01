import type {
  CodexStatusReport,
  CodexThreadStatus,
  DiagnosisReport,
  EnvironmentCandidate,
  RepairPlan,
  RepairResult
} from "./types.ts";

type CursorStage = "scan" | "diagnose" | "preview" | "repair";
type LogLevel = "info" | "success" | "warning" | "error";

interface UiLog {
  id: number;
  time: string;
  level: LogLevel;
  message: string;
}

const cursors: Record<CursorStage, string> = {
  scan: "Scan",
  diagnose: "Diagnose",
  preview: "Preview",
  repair: "Repair"
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function nowText(): string {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

function formatTime(value: string | null): string {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString("zh-CN", { hour12: false });
}

function threadState(thread: CodexThreadStatus): { label: string; tone: "ok" | "warn" | "danger" } {
  if (thread.status.includes("missing-db") || thread.status.includes("missing-jsonl")) {
    return { label: "Data Missing", tone: "danger" };
  }
  if (thread.status.includes("need-sync")) return { label: "Needs Sync", tone: "warn" };
  if (thread.status.includes("archived")) return { label: "Archived", tone: "warn" };
  return { label: "Ready", tone: "ok" };
}

function cursorStepList(stage: CursorStage): Array<{ key: CursorStage; label: string; state: "done" | "current" | "pending" }> {
  const order: CursorStage[] = ["scan", "diagnose", "preview", "repair"];
  const idx = order.indexOf(stage);
  return order.map((key, i) => ({
    key,
    label: cursors[key],
    state: i < idx ? "done" : i === idx ? "current" : "pending"
  }));
}

export class RestoreAppView {
  private readonly root: HTMLElement;
  private busy = false;
  private error = "";
  private logs: UiLog[] = [];
  private logId = 1;

  private riskAck = false;
  private patchJsonl = true;

  private codexStatus: CodexStatusReport | null = null;
  private selectedThreadIds = new Set<string>();
  private selectedBackupPath = "";

  private cursorCandidates: EnvironmentCandidate[] = [];
  private cursorCandidateId = "";
  private cursorStage: CursorStage = "scan";
  private cursorReport: DiagnosisReport | null = null;
  private cursorPlan: RepairPlan | null = null;
  private cursorResult: RepairResult | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  async init(): Promise<void> {
    this.render();
    if (!window.restoreApp) {
      this.error = "Desktop bridge missing. Restart app.";
      this.render();
      return;
    }
    this.pushLog("info", "Workbench booting...");
    await this.refreshAll();
  }

  private pushLog(level: LogLevel, message: string): void {
    this.logs = [{ id: this.logId++, time: nowText(), level, message }, ...this.logs].slice(0, 180);
  }

  private applyCodexStatus(status: CodexStatusReport): void {
    this.codexStatus = status;
    const allowed = new Set(status.threads.map((row) => row.id));
    for (const id of [...this.selectedThreadIds]) {
      if (!allowed.has(id)) this.selectedThreadIds.delete(id);
    }
    if (this.selectedThreadIds.size === 0 && status.threads[0]) {
      this.selectedThreadIds.add(status.threads[0].id);
    }
    const knownBackups = new Set(status.backups.map((b) => b.path));
    if (!knownBackups.has(this.selectedBackupPath)) {
      this.selectedBackupPath = status.backups[0]?.path ?? "";
    }
  }

  private async refreshAll(): Promise<void> {
    this.busy = true;
    this.error = "";
    this.render();
    try {
      const [status, envs] = await Promise.all([
        window.restoreApp.codexStatus({ candidateId: this.codexStatus?.candidateId }),
        window.restoreApp.scanEnvironments()
      ]);
      this.applyCodexStatus(status);
      this.cursorCandidates = envs.filter((item) => item.product === "cursor");
      if (!this.cursorCandidates.some((item) => item.id === this.cursorCandidateId)) {
        this.cursorCandidateId = this.cursorCandidates[0]?.id ?? "";
      }
      this.pushLog("success", "Workbench ready.");
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.pushLog("error", `Refresh failed: ${this.error}`);
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private async refreshCodexOnly(): Promise<void> {
    const status = await window.restoreApp.codexStatus({ candidateId: this.codexStatus?.candidateId });
    this.applyCodexStatus(status);
  }

  private requireRisk(action: string): boolean {
    if (this.riskAck) return true;
    this.error = `${action}: please check risk confirmation first.`;
    this.pushLog("warning", `${action} blocked (risk confirmation missing).`);
    this.render();
    return false;
  }

  private confirmAction(title: string, body: string): boolean {
    return window.confirm(`${title}\n\n${body}\n\nPlease close Cursor/Codex before continuing.`);
  }

  private async withBusy(task: () => Promise<void>): Promise<void> {
    this.busy = true;
    this.error = "";
    this.render();
    try {
      await task();
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.pushLog("error", this.error);
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private selectAll(): void {
    if (!this.codexStatus) return;
    this.selectedThreadIds = new Set(this.codexStatus.threads.map((item) => item.id));
    this.render();
  }

  private selectNeedSync(): void {
    if (!this.codexStatus) return;
    this.selectedThreadIds = new Set(
      this.codexStatus.threads.filter((item) => item.syncCandidate).map((item) => item.id)
    );
    this.render();
  }

  private clearSelection(): void {
    this.selectedThreadIds.clear();
    this.render();
  }

  private async syncSelected(): Promise<void> {
    if (!this.codexStatus) return;
    if (!this.requireRisk("Sync Selected")) return;
    const threadIds = [...this.selectedThreadIds];
    if (threadIds.length === 0) {
      this.error = "No thread selected.";
      this.render();
      return;
    }
    if (
      !this.confirmAction(
        "Sync Selected Threads",
        `Threads: ${threadIds.length}\nPatch JSONL: ${this.patchJsonl ? "ON" : "OFF"}`
      )
    ) {
      return;
    }
    await this.withBusy(async () => {
      const result = await window.restoreApp.codexSync({
        candidateId: this.codexStatus!.candidateId,
        threadIds,
        patchJsonlHeaders: this.patchJsonl
      });
      this.pushLog(
        "success",
        `Sync done: rows=${result.updatedRows}, archivedCopies=${result.copiedArchivedJsonl}, jsonlPatched=${result.jsonlPatched}`
      );
      this.pushLog("info", `Backup: ${result.backupPath}`);
      await this.refreshCodexOnly();
    });
  }

  private async syncCandidates(): Promise<void> {
    if (!this.codexStatus) return;
    if (!this.requireRisk("Sync Candidates")) return;
    if (
      !this.confirmAction(
        "Sync All Candidates",
        `Auto-select all sync candidates.\nPatch JSONL: ${this.patchJsonl ? "ON" : "OFF"}`
      )
    ) {
      return;
    }
    await this.withBusy(async () => {
      const result = await window.restoreApp.codexSync({
        candidateId: this.codexStatus!.candidateId,
        patchJsonlHeaders: this.patchJsonl
      });
      this.pushLog(
        "success",
        `Candidate sync done: rows=${result.updatedRows}, archivedCopies=${result.copiedArchivedJsonl}, jsonlPatched=${result.jsonlPatched}`
      );
      this.pushLog("info", `Backup: ${result.backupPath}`);
      await this.refreshCodexOnly();
    });
  }

  private async deleteSelected(): Promise<void> {
    if (!this.codexStatus) return;
    if (!this.requireRisk("Delete Selected")) return;
    const threadIds = [...this.selectedThreadIds];
    if (threadIds.length === 0) {
      this.error = "No thread selected for delete.";
      this.render();
      return;
    }
    await this.withBusy(async () => {
      const preview = await window.restoreApp.codexDelete({
        candidateId: this.codexStatus!.candidateId,
        threadIds,
        dryRun: true
      });
      const ok = this.confirmAction(
        "Delete Selected Threads",
        `Threads: ${preview.selectedThreads}\nJSONL matches: ${preview.matchedJsonlFiles}\nThis performs soft-delete to history_sync_deleted.`
      );
      if (!ok) return;

      const result = await window.restoreApp.codexDelete({
        candidateId: this.codexStatus!.candidateId,
        threadIds,
        dryRun: false
      });
      this.pushLog(
        "warning",
        `Delete done: dbRows=${result.deletedDbRows}, movedJsonl=${result.movedJsonlFiles}, removedIndex=${result.removedIndexRows}`
      );
      if (result.backupPath) this.pushLog("info", `Delete backup: ${result.backupPath}`);
      if (result.deletedDir) this.pushLog("info", `Deleted dir: ${result.deletedDir}`);
      await this.refreshCodexOnly();
    });
  }

  private async createBackup(): Promise<void> {
    if (!this.codexStatus) return;
    if (!this.requireRisk("Create Backup")) return;
    if (!this.confirmAction("Create Manual Backup", "Create a new state_5.sqlite backup now.")) return;
    await this.withBusy(async () => {
      const result = await window.restoreApp.codexBackupCreate({
        candidateId: this.codexStatus!.candidateId
      });
      this.pushLog("success", `Backup created: ${result.backupPath}`);
      await this.refreshCodexOnly();
    });
  }

  private async restoreBackup(pathToRestore: string): Promise<void> {
    if (!this.codexStatus) return;
    if (!this.requireRisk("Restore Backup")) return;
    if (!pathToRestore) {
      this.error = "No backup selected.";
      this.render();
      return;
    }
    if (
      !this.confirmAction(
        "Restore Backup",
        `Restore from:\n${pathToRestore}\nA pre-restore safety backup will be created automatically.`
      )
    ) {
      return;
    }
    await this.withBusy(async () => {
      const result = await window.restoreApp.codexBackupRestore({
        candidateId: this.codexStatus!.candidateId,
        backupPath: pathToRestore
      });
      this.pushLog("success", `Restored: ${result.restoredFrom}`);
      this.pushLog("info", `Safety backup: ${result.safetyBackup}`);
      await this.refreshCodexOnly();
    });
  }

  private async openBackupDir(): Promise<void> {
    await this.withBusy(async () => {
      await window.restoreApp.openCodexBackup({ candidateId: this.codexStatus?.candidateId });
      this.pushLog("info", "Opened backup directory.");
    });
  }

  private async openDeletedDir(): Promise<void> {
    await this.withBusy(async () => {
      await window.restoreApp.openCodexDeleted({ candidateId: this.codexStatus?.candidateId });
      this.pushLog("info", "Opened deleted directory.");
    });
  }

  private async runCursorDiagnose(): Promise<void> {
    if (!this.cursorCandidateId) return;
    await this.withBusy(async () => {
      this.cursorReport = await window.restoreApp.diagnoseEnvironment(this.cursorCandidateId);
      this.cursorPlan = null;
      this.cursorResult = null;
      this.cursorStage = "diagnose";
      this.pushLog("success", "Cursor diagnose done.");
    });
  }

  private async runCursorPreview(): Promise<void> {
    if (!this.cursorCandidateId) return;
    await this.withBusy(async () => {
      this.cursorPlan = await window.restoreApp.previewRepair(this.cursorCandidateId);
      this.cursorResult = null;
      this.cursorStage = "preview";
      this.pushLog("success", "Cursor preview ready.");
    });
  }

  private async runCursorRepair(): Promise<void> {
    if (!this.cursorPlan) return;
    if (!this.requireRisk("Cursor Repair")) return;
    if (!this.confirmAction("Run Cursor Repair", "This will write Cursor metadata in state database.")) return;
    await this.withBusy(async () => {
      this.cursorResult = await window.restoreApp.applyRepair(this.cursorPlan!.planId);
      this.cursorStage = "repair";
      this.pushLog("success", `Cursor repaired. Backup: ${this.cursorResult.backupPath}`);
      await this.refreshAll();
    });
  }

  private async runCursorRestoreLatest(): Promise<void> {
    if (!this.cursorCandidateId) return;
    if (!this.requireRisk("Cursor Restore")) return;
    if (!this.confirmAction("Restore Cursor Latest Backup", "Restore latest Cursor backup and overwrite current state.")) return;
    await this.withBusy(async () => {
      const result = await window.restoreApp.restoreLatestBackup(this.cursorCandidateId);
      this.pushLog("success", `Cursor restored from: ${result.restoredFrom}`);
      await this.refreshAll();
    });
  }

  private async openCursorBackupDir(): Promise<void> {
    if (!this.cursorCandidateId) return;
    await this.withBusy(async () => {
      await window.restoreApp.openBackupFolder(this.cursorCandidateId);
      this.pushLog("info", "Opened Cursor backup directory.");
    });
  }

  private bindEvents(): void {
    const pick = (id: string): HTMLElement | null => this.root.querySelector(`[data-id="${id}"]`);

    pick("refresh")?.addEventListener("click", () => void this.refreshAll());
    pick("select-all")?.addEventListener("click", () => this.selectAll());
    pick("select-sync")?.addEventListener("click", () => this.selectNeedSync());
    pick("select-clear")?.addEventListener("click", () => this.clearSelection());
    pick("sync-selected")?.addEventListener("click", () => void this.syncSelected());
    pick("sync-candidates")?.addEventListener("click", () => void this.syncCandidates());
    pick("delete-selected")?.addEventListener("click", () => void this.deleteSelected());
    pick("create-backup")?.addEventListener("click", () => void this.createBackup());
    pick("restore-selected")?.addEventListener("click", () => void this.restoreBackup(this.selectedBackupPath));
    pick("restore-latest")?.addEventListener("click", () => {
      void this.restoreBackup(this.codexStatus?.backups[0]?.path ?? "");
    });
    pick("open-backups")?.addEventListener("click", () => void this.openBackupDir());
    pick("open-deleted")?.addEventListener("click", () => void this.openDeletedDir());

    pick("cursor-diagnose")?.addEventListener("click", () => void this.runCursorDiagnose());
    pick("cursor-preview")?.addEventListener("click", () => void this.runCursorPreview());
    pick("cursor-repair")?.addEventListener("click", () => void this.runCursorRepair());
    pick("cursor-restore")?.addEventListener("click", () => void this.runCursorRestoreLatest());
    pick("cursor-open-backups")?.addEventListener("click", () => void this.openCursorBackupDir());

    this.root.querySelectorAll<HTMLInputElement>("[data-thread-id]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const id = checkbox.dataset.threadId ?? "";
        if (!id) return;
        if (checkbox.checked) this.selectedThreadIds.add(id);
        else this.selectedThreadIds.delete(id);
        this.render();
      });
    });

    const risk = this.root.querySelector<HTMLInputElement>("[data-risk]");
    risk?.addEventListener("change", () => {
      this.riskAck = !!risk.checked;
      this.render();
    });

    const patch = this.root.querySelector<HTMLInputElement>("[data-patch-jsonl]");
    patch?.addEventListener("change", () => {
      this.patchJsonl = !!patch.checked;
      this.render();
    });

    const backup = this.root.querySelector<HTMLSelectElement>("[data-backup]");
    backup?.addEventListener("change", () => {
      this.selectedBackupPath = backup.value;
      this.render();
    });

    const cursor = this.root.querySelector<HTMLSelectElement>("[data-cursor]");
    cursor?.addEventListener("change", () => {
      this.cursorCandidateId = cursor.value;
      this.cursorStage = "scan";
      this.cursorPlan = null;
      this.cursorReport = null;
      this.cursorResult = null;
      this.render();
    });
  }

  render(): void {
    const codex = this.codexStatus;
    const threads = codex?.threads ?? [];
    const selectedCount = this.selectedThreadIds.size;
    const needSyncCount = threads.filter((t) => t.syncCandidate).length;
    const currentProvider = codex?.currentProvider ?? "-";
    const currentModel = codex?.currentModel ?? "-";

    const threadRows =
      threads.length === 0
        ? `<tr><td colspan="10" class="cell-empty">No threads found</td></tr>`
        : threads
            .map((thread) => {
              const badge = threadState(thread);
              return `
                <tr>
                  <td><input type="checkbox" data-thread-id="${escapeHtml(thread.id)}" ${this.selectedThreadIds.has(thread.id) ? "checked" : ""} ${this.busy ? "disabled" : ""}/></td>
                  <td title="${escapeHtml(thread.title)}">${escapeHtml(thread.title)}</td>
                  <td>${escapeHtml(thread.provider || "-")}</td>
                  <td>${escapeHtml(thread.model || "-")}</td>
                  <td>${escapeHtml(thread.jsonlProvider || "-")}</td>
                  <td><span class="state-pill ${badge.tone}">${escapeHtml(badge.label)}</span></td>
                  <td>${escapeHtml(formatTime(thread.updatedAt))}</td>
                  <td title="${escapeHtml(thread.cwd || "-")}">${escapeHtml(thread.cwd || "-")}</td>
                  <td title="${escapeHtml(thread.id)}">${escapeHtml(thread.id)}</td>
                </tr>
              `;
            })
            .join("");

    const backupOptions =
      codex?.backups.length
        ? codex.backups
            .map(
              (b) =>
                `<option value="${escapeHtml(b.path)}" ${this.selectedBackupPath === b.path ? "selected" : ""}>${escapeHtml(b.modifiedAt)} | ${escapeHtml(b.name)}</option>`
            )
            .join("")
        : `<option value="">No backup available</option>`;

    const providerStats =
      codex?.providerCounts.length
        ? codex.providerCounts.map((p) => `<li>${escapeHtml(p.key)}: ${p.count}</li>`).join("")
        : "<li>-</li>";
    const modelStats =
      codex?.modelCounts.length
        ? codex.modelCounts.map((p) => `<li>${escapeHtml(p.key)}: ${p.count}</li>`).join("")
        : "<li>-</li>";

    const cursorOptions =
      this.cursorCandidates.length === 0
        ? `<option value="">No Cursor environment</option>`
        : this.cursorCandidates
            .map(
              (c) =>
                `<option value="${escapeHtml(c.id)}" ${this.cursorCandidateId === c.id ? "selected" : ""}>${escapeHtml(c.rootPath)}</option>`
            )
            .join("");

    const cursorIssues =
      this.cursorReport?.issues.length
        ? `<ul>${this.cursorReport.issues.map((i) => `<li><strong>${escapeHtml(i.code)}</strong>: ${escapeHtml(i.message)}</li>`).join("")}</ul>`
        : "<p>No diagnose result.</p>";
    const cursorPreview = this.cursorPlan
      ? `Threads=${this.cursorPlan.summary.threadCount}, SQLite=${this.cursorPlan.summary.sqliteUpdates}, JSONL=${this.cursorPlan.summary.jsonlUpdates}`
      : "No preview result.";
    const cursorResult = this.cursorResult
      ? `Updated threads=${this.cursorResult.summary.updatedThreads}, JSONL=${this.cursorResult.summary.updatedJsonlFiles}, backup=${this.cursorResult.backupPath}`
      : "No repair result.";

    const steps = cursorStepList(this.cursorStage)
      .map((s) => `<div class="cursor-step ${s.state}"><div>${escapeHtml(s.state.toUpperCase())}</div><div>${escapeHtml(s.label)}</div></div>`)
      .join("");

    const logs =
      this.logs.length === 0
        ? `<div class="cell-empty">No logs yet</div>`
        : this.logs
            .map(
              (l) =>
                `<div class="log-row ${l.level}"><span>${escapeHtml(l.time)}</span><span>${escapeHtml(l.level.toUpperCase())}</span><span>${escapeHtml(l.message)}</span></div>`
            )
            .join("");

    this.root.innerHTML = `
      <style>
        :root {
          --bg: #f3f7fb;
          --panel: #ffffff;
          --line: #dee6ef;
          --line-soft: #edf2f7;
          --text: #172b40;
          --muted: #627488;
          --brand: #1f5ea8;
          --brand-deep: #153b67;
          --ok: #1f7a4a;
          --warn: #b06a1a;
          --danger: #b13a36;
        }
        * { box-sizing: border-box; }
        body { margin: 0; }
        .workbench {
          min-height: 100vh;
          background:
            radial-gradient(1200px 540px at -8% -10%, #d6eaff 0%, transparent 58%),
            radial-gradient(900px 420px at 105% -8%, #e6fff2 0%, transparent 56%),
            var(--bg);
          color: var(--text);
          font-family: "Avenir Next", "Segoe UI Variable Text", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
          padding: 22px;
        }
        .hero {
          background: linear-gradient(128deg, #173f67 0%, #215983 58%, #2e755e 100%);
          border-radius: 18px;
          color: #f7fbff;
          padding: 20px 22px;
          box-shadow: 0 22px 48px rgba(16, 28, 45, 0.25);
          animation: fadeIn 380ms ease-out;
        }
        .hero h1 { margin: 0; font-size: 28px; letter-spacing: 0.3px; }
        .hero p { margin: 9px 0 0; font-size: 13px; color: rgba(247, 251, 255, 0.86); }
        .layout {
          margin-top: 14px;
          display: grid;
          grid-template-columns: minmax(0, 1.8fr) minmax(360px, 1fr);
          gap: 14px;
        }
        .panel {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 14px;
          box-shadow: 0 9px 22px rgba(16, 30, 43, 0.06);
          padding: 14px;
          animation: fadeIn 420ms ease-out;
        }
        .panel h2 { margin: 0; font-size: 20px; }
        .muted { color: var(--muted); font-size: 13px; }
        .kpis {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
        }
        .kpi {
          border: 1px solid var(--line-soft);
          border-radius: 10px;
          padding: 9px;
          background: #f8fbff;
        }
        .kpi .v { font-size: 23px; font-weight: 700; color: var(--brand-deep); line-height: 1.1; }
        .kpi .k { margin-top: 3px; font-size: 12px; color: var(--muted); }
        .toolbar {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .controls {
          margin-top: 10px;
          display: grid;
          gap: 7px;
        }
        .risk-box {
          border: 1px solid #f1d7d6;
          background: #fff7f7;
          border-radius: 9px;
          color: #973532;
          font-size: 12px;
          padding: 8px 10px;
        }
        .table-wrap {
          margin-top: 10px;
          border: 1px solid var(--line);
          border-radius: 10px;
          overflow: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        th, td {
          border-bottom: 1px solid var(--line-soft);
          padding: 8px;
          text-align: left;
          white-space: nowrap;
          vertical-align: middle;
        }
        th {
          position: sticky;
          top: 0;
          background: #f6fbff;
          color: #4f6073;
          font-weight: 600;
        }
        .state-pill {
          display: inline-block;
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 600;
        }
        .state-pill.ok { background: #e9f8f0; color: var(--ok); }
        .state-pill.warn { background: #fff2e2; color: var(--warn); }
        .state-pill.danger { background: #ffecec; color: var(--danger); }
        .cards {
          margin-top: 10px;
          display: grid;
          gap: 10px;
        }
        .card {
          border: 1px solid var(--line-soft);
          border-radius: 10px;
          padding: 10px;
          background: #fbfdff;
        }
        .card h3 { margin: 0 0 8px; font-size: 14px; }
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .log-box {
          border: 1px solid var(--line);
          border-radius: 10px;
          max-height: 250px;
          overflow: auto;
          background: #f9fbfe;
        }
        .log-row {
          display: grid;
          grid-template-columns: 126px 76px 1fr;
          gap: 8px;
          padding: 8px 10px;
          font-size: 12px;
          border-bottom: 1px solid #edf2f8;
        }
        .log-row.info span:nth-child(2) { color: #2064b1; font-weight: 700; }
        .log-row.success span:nth-child(2) { color: #1f7a4a; font-weight: 700; }
        .log-row.warning span:nth-child(2) { color: #b06a1a; font-weight: 700; }
        .log-row.error span:nth-child(2) { color: #b13a36; font-weight: 700; }
        .cursor-steps {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }
        .cursor-step {
          border: 1px solid var(--line);
          border-radius: 9px;
          padding: 7px;
          font-size: 11px;
          color: #506074;
        }
        .cursor-step.done { background: #ecf8f1; color: #1f7a4a; border-color: #cde7d9; }
        .cursor-step.current { background: #eaf4ff; color: #1f5ea8; border-color: #c9ddfb; }
        .cell-empty {
          padding: 14px;
          text-align: center;
          color: #728295;
        }
        .tip-busy { margin-top: 10px; color: #1f5ea8; font-size: 13px; }
        .tip-error { margin-top: 6px; color: #b13a36; font-size: 13px; }
        button, select { font: inherit; }
        button {
          border: 1px solid #ced8e4;
          background: #fff;
          border-radius: 9px;
          padding: 6px 10px;
          cursor: pointer;
          transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
        }
        button:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: #96afcd;
          box-shadow: 0 6px 14px rgba(36, 61, 86, 0.12);
        }
        button:disabled { opacity: 0.46; cursor: not-allowed; transform: none; box-shadow: none; }
        .btn-primary { background: var(--brand); color: #fff; border-color: var(--brand); }
        .btn-danger { background: var(--danger); color: #fff; border-color: var(--danger); }
        select {
          border: 1px solid #ced8e4;
          background: #fff;
          border-radius: 8px;
          padding: 6px 8px;
          width: 100%;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 1200px) {
          .layout { grid-template-columns: 1fr; }
          .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .stats-grid { grid-template-columns: 1fr; }
        }
      </style>
      <div class="workbench">
        <header class="hero">
          <h1>Codex Recovery Workbench</h1>
          <p>Thread-level recovery console for Codex, with an isolated Cursor repair lane.</p>
        </header>
        <div class="layout">
          <section class="panel">
            <h2>Codex Console</h2>
            <div class="muted">${escapeHtml(codex?.codexHome ?? "No Codex environment found")}</div>
            <div class="kpis">
              <div class="kpi"><div class="v">${codex?.totalThreads ?? 0}</div><div class="k">Total Threads</div></div>
              <div class="kpi"><div class="v">${codex?.visibleThreads ?? 0}</div><div class="k">Visible</div></div>
              <div class="kpi"><div class="v">${codex?.movableThreads ?? 0}</div><div class="k">Need Sync</div></div>
              <div class="kpi"><div class="v">${selectedCount}</div><div class="k">Selected</div></div>
              <div class="kpi"><div class="v">${needSyncCount}</div><div class="k">Candidates</div></div>
            </div>
            <div class="toolbar">
              <button data-id="refresh" ${this.busy ? "disabled" : ""}>Refresh</button>
              <button data-id="select-all" ${this.busy ? "disabled" : ""}>Select All</button>
              <button data-id="select-sync" ${this.busy ? "disabled" : ""}>Select Need Sync</button>
              <button data-id="select-clear" ${this.busy ? "disabled" : ""}>Clear</button>
              <button class="btn-primary" data-id="sync-selected" ${this.busy ? "disabled" : ""}>Sync Selected</button>
              <button class="btn-primary" data-id="sync-candidates" ${this.busy ? "disabled" : ""}>Sync Candidates</button>
              <button class="btn-danger" data-id="delete-selected" ${this.busy ? "disabled" : ""}>Delete Selected</button>
            </div>
            <div class="controls">
              <label><input type="checkbox" data-patch-jsonl ${this.patchJsonl ? "checked" : ""} ${this.busy ? "disabled" : ""}/> Patch JSONL headers during sync</label>
              <label><input type="checkbox" data-risk ${this.riskAck ? "checked" : ""} ${this.busy ? "disabled" : ""}/> I understand risk and already backed up data</label>
              <div class="risk-box">High-risk actions modify local SQLite/JSONL data. Always close Cursor/Codex before write operations.</div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pick</th><th>Title</th><th>DB Provider</th><th>Model</th><th>JSONL Provider</th><th>Status</th><th>Updated</th><th>CWD</th><th>Thread ID</th>
                  </tr>
                </thead>
                <tbody>${threadRows}</tbody>
              </table>
            </div>
          </section>

          <aside class="panel">
            <h2>Operations</h2>
            <div class="cards">
              <div class="card">
                <h3>Backup Workbench</h3>
                <select data-backup ${this.busy ? "disabled" : ""}>${backupOptions}</select>
                <div class="toolbar">
                  <button data-id="create-backup" ${this.busy ? "disabled" : ""}>Create Backup</button>
                  <button data-id="restore-selected" ${this.busy ? "disabled" : ""}>Restore Selected</button>
                  <button data-id="restore-latest" ${this.busy ? "disabled" : ""}>Restore Latest</button>
                  <button data-id="open-backups" ${this.busy ? "disabled" : ""}>Open Backups Dir</button>
                  <button data-id="open-deleted" ${this.busy ? "disabled" : ""}>Open Deleted Dir</button>
                </div>
              </div>

              <div class="card">
                <h3>Context Snapshot</h3>
                <div class="muted">Provider: <strong>${escapeHtml(currentProvider)}</strong></div>
                <div class="muted">Model: <strong>${escapeHtml(currentModel)}</strong></div>
                <div class="stats-grid">
                  <div>
                    <div class="muted">Provider distribution</div>
                    <ul>${providerStats}</ul>
                  </div>
                  <div>
                    <div class="muted">Model distribution</div>
                    <ul>${modelStats}</ul>
                  </div>
                </div>
              </div>

              <div class="card">
                <h3>Cursor Recovery Lane</h3>
                <select data-cursor ${this.busy ? "disabled" : ""}>${cursorOptions}</select>
                <div class="cursor-steps">${steps}</div>
                <div class="toolbar">
                  <button data-id="cursor-diagnose" ${this.busy || !this.cursorCandidateId ? "disabled" : ""}>Diagnose</button>
                  <button data-id="cursor-preview" ${this.busy || !this.cursorCandidateId ? "disabled" : ""}>Preview</button>
                  <button class="btn-primary" data-id="cursor-repair" ${this.busy || !this.cursorPlan ? "disabled" : ""}>Repair</button>
                  <button data-id="cursor-restore" ${this.busy || !this.cursorCandidateId ? "disabled" : ""}>Restore Latest</button>
                  <button data-id="cursor-open-backups" ${this.busy || !this.cursorCandidateId ? "disabled" : ""}>Open Backup Dir</button>
                </div>
                <div class="cards">
                  <div class="card"><h3>Diagnose</h3>${cursorIssues}</div>
                  <div class="card"><h3>Preview</h3><p>${escapeHtml(cursorPreview)}</p></div>
                  <div class="card"><h3>Result</h3><p>${escapeHtml(cursorResult)}</p></div>
                </div>
              </div>

              <div class="card">
                <h3>Operation Logs</h3>
                <div class="log-box">${logs}</div>
              </div>
            </div>
          </aside>
        </div>
        ${this.busy ? `<div class="tip-busy">Running...</div>` : ""}
        ${this.error ? `<div class="tip-error">${escapeHtml(this.error)}</div>` : ""}
      </div>
    `;

    this.bindEvents();
  }
}
