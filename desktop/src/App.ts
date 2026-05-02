import type {
  CodexDeleteResult,
  CodexStatusReport,
  CodexThreadStatus,
  DiagnosisReport,
  EnvironmentCandidate,
  RepairPlan,
  RepairResult
} from "./types.ts";
import { renderThreadDetails, renderWorkbench } from "./ui/workbench-render.ts";
import { ensureWorkbenchStyle } from "./ui/workbench-style.ts";
import { normalizeText, nowText } from "./ui/workbench-utils.ts";
import type {
  CursorStage,
  LogLevel,
  SortDirection,
  ThreadFilter,
  ThreadSort,
  UiLog,
  WorkbenchViewState
} from "./ui/workbench-types.ts";

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
  private activeThreadId = "";
  private threadQuery = "";
  private threadFilter: ThreadFilter = "all";
  private threadSort: ThreadSort = "updated";
  private sortDirection: SortDirection = "desc";

  private cursorCandidates: EnvironmentCandidate[] = [];
  private cursorCandidateId = "";
  private cursorStage: CursorStage = "scan";
  private cursorReport: DiagnosisReport | null = null;
  private cursorPlan: RepairPlan | null = null;
  private cursorResult: RepairResult | null = null;
  private lastDeletePreview: CodexDeleteResult | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  async init(): Promise<void> {
    ensureWorkbenchStyle();
    this.render();
    if (!window.restoreApp) {
      this.error = "桌面桥接未加载，请重启应用。";
      this.render();
      return;
    }
    this.pushLog("info", "工作台启动中...");
    await this.refreshAll();
  }

  private pushLog(level: LogLevel, message: string): void {
    this.logs = [{ id: this.logId++, time: nowText(), level, message }, ...this.logs].slice(0, 220);
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
    if (!allowed.has(this.activeThreadId)) {
      this.activeThreadId = status.threads[0]?.id ?? "";
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
      this.pushLog("success", "工作台已就绪。");
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.pushLog("error", `刷新失败：${this.error}`);
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
    this.error = `${action}：请先勾选风险确认。`;
    this.pushLog("warning", `${action}已拦截（未确认风险）。`);
    this.render();
    return false;
  }

  private confirmAction(title: string, body: string): boolean {
    return window.confirm(`${title}\n\n${body}\n\n继续前请先关闭 Cursor/Codex。`);
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
    if (this.threadFilter === "selected" || !this.patchSelectionUi()) this.render();
  }

  private selectNeedSync(): void {
    if (!this.codexStatus) return;
    this.selectedThreadIds = new Set(
      this.codexStatus.threads.filter((item) => item.syncCandidate).map((item) => item.id)
    );
    if (this.threadFilter === "selected" || !this.patchSelectionUi()) this.render();
  }

  private clearSelection(): void {
    this.selectedThreadIds.clear();
    if (this.threadFilter === "selected" || !this.patchSelectionUi()) this.render();
  }

  private selectOnlyActive(): void {
    if (!this.activeThreadId) return;
    this.selectedThreadIds = new Set([this.activeThreadId]);
    if (this.threadFilter === "selected" || !this.patchSelectionUi()) this.render();
  }

  private toggleSortDirection(): void {
    this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    this.render();
  }

  private getFilteredThreads(): CodexThreadStatus[] {
    const rows = this.codexStatus?.threads ?? [];
    const query = normalizeText(this.threadQuery);
    let filtered = rows.filter((thread) => {
      if (this.threadFilter === "need-sync" && !thread.syncCandidate) return false;
      if (this.threadFilter === "archived" && thread.archived === 0) return false;
      if (
        this.threadFilter === "missing" &&
        !thread.status.includes("missing-db") &&
        !thread.status.includes("missing-jsonl")
      ) {
        return false;
      }
      if (this.threadFilter === "selected" && !this.selectedThreadIds.has(thread.id)) return false;
      if (!query) return true;
      const bag = [
        thread.title,
        thread.id,
        thread.provider,
        thread.model,
        thread.jsonlProvider,
        thread.cwd
      ]
        .join(" ")
        .toLowerCase();
      return bag.includes(query);
    });

    filtered = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (this.threadSort === "updated") cmp = a.updatedAtMs - b.updatedAtMs;
      else if (this.threadSort === "title") cmp = a.title.localeCompare(b.title);
      else cmp = a.provider.localeCompare(b.provider);
      return this.sortDirection === "asc" ? cmp : -cmp;
    });
    return filtered;
  }

  private getActiveThread(): CodexThreadStatus | null {
    const rows = this.codexStatus?.threads ?? [];
    return rows.find((row) => row.id === this.activeThreadId) ?? null;
  }

  private escapeForSelector(value: string): string {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(value);
    }
    return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  }

  private updateSelectionCounters(): void {
    const selected = this.selectedThreadIds.size;
    const total = this.codexStatus?.threads.length ?? 0;
    const kpiSelected = this.root.querySelector<HTMLElement>('[data-bind="kpi-selected"]');
    if (kpiSelected) kpiSelected.textContent = String(selected);
    const statusSelected = this.root.querySelector<HTMLElement>('[data-bind="status-selected"]');
    if (statusSelected) statusSelected.textContent = `${selected} / ${total}`;
  }

  private patchActiveThreadUi(): boolean {
    const rows = this.root.querySelectorAll<HTMLElement>("[data-row-id]");
    if (rows.length === 0) return false;
    rows.forEach((row) => {
      const isActive = (row.dataset.rowId ?? "") === this.activeThreadId;
      row.classList.toggle("row-active", isActive);
      row.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    const detailBody = this.root.querySelector<HTMLElement>('[data-bind="thread-detail-body"]');
    if (detailBody) {
      detailBody.innerHTML = renderThreadDetails(this.getActiveThread());
    }

    const activeOnlyButton = this.root.querySelector<HTMLButtonElement>('[data-id="select-active-only"]');
    if (activeOnlyButton) {
      activeOnlyButton.disabled = this.busy || !this.activeThreadId;
    }
    return true;
  }

  private patchSelectionUi(threadId?: string): boolean {
    const checkboxes = this.root.querySelectorAll<HTMLInputElement>("[data-thread-id]");
    if (checkboxes.length === 0) return false;

    if (threadId) {
      const selectorId = this.escapeForSelector(threadId);
      const checkbox = this.root.querySelector<HTMLInputElement>(`[data-thread-id="${selectorId}"]`);
      if (checkbox) {
        checkbox.checked = this.selectedThreadIds.has(threadId);
      }
    } else {
      checkboxes.forEach((checkbox) => {
        const id = checkbox.dataset.threadId ?? "";
        checkbox.checked = this.selectedThreadIds.has(id);
      });
    }

    this.updateSelectionCounters();
    return true;
  }

  private focusThreadRow(threadId: string): void {
    if (!threadId) return;
    queueMicrotask(() => {
      const selectorId = this.escapeForSelector(threadId);
      const row = this.root.querySelector<HTMLElement>(`[data-row-id="${selectorId}"]`);
      row?.focus();
    });
  }

  private activateThread(threadId: string, focus = false): void {
    if (!threadId) return;
    this.activeThreadId = threadId;
    if (!this.patchActiveThreadUi()) {
      this.render();
    }
    if (focus) this.focusThreadRow(threadId);
  }

  private toggleThreadSelection(threadId: string): void {
    if (!threadId) return;
    if (this.selectedThreadIds.has(threadId)) this.selectedThreadIds.delete(threadId);
    else this.selectedThreadIds.add(threadId);
    if (this.threadFilter === "selected" || !this.patchSelectionUi(threadId)) {
      this.render();
    }
    this.focusThreadRow(threadId);
  }

  private moveActiveThread(offset: number): void {
    const rows = this.getFilteredThreads();
    if (rows.length === 0) return;
    const currentIndex = rows.findIndex((row) => row.id === this.activeThreadId);
    const baseIndex = currentIndex === -1 ? (offset >= 0 ? 0 : rows.length - 1) : currentIndex;
    const nextIndex = Math.min(rows.length - 1, Math.max(0, baseIndex + offset));
    const next = rows[nextIndex];
    if (!next) return;
    this.activateThread(next.id, true);
  }

  private async syncSelected(): Promise<void> {
    if (!this.codexStatus) return;
    if (!this.requireRisk("同步所选会话")) return;
    const threadIds = [...this.selectedThreadIds];
    if (threadIds.length === 0) {
      this.error = "请先选择会话。";
      this.render();
      return;
    }
    if (
      !this.confirmAction(
        "同步所选会话",
        `会话数量：${threadIds.length}\n同步时修复 JSONL 头：${this.patchJsonl ? "开启" : "关闭"}`
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
        `同步完成：数据库更新 ${result.updatedRows}，归档回填 ${result.copiedArchivedJsonl}，JSONL 修复 ${result.jsonlPatched}`
      );
      this.pushLog("info", `备份：${result.backupPath}`);
      await this.refreshCodexOnly();
    });
  }

  private async syncCandidates(): Promise<void> {
    if (!this.codexStatus) return;
    if (!this.requireRisk("同步候选会话")) return;
    if (
      !this.confirmAction(
        "同步全部候选会话",
        `自动选择全部候选会话。\n同步时修复 JSONL 头：${this.patchJsonl ? "开启" : "关闭"}`
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
        `候选同步完成：数据库更新 ${result.updatedRows}，归档回填 ${result.copiedArchivedJsonl}，JSONL 修复 ${result.jsonlPatched}`
      );
      this.pushLog("info", `备份：${result.backupPath}`);
      await this.refreshCodexOnly();
    });
  }

  private async deleteSelected(): Promise<void> {
    if (!this.codexStatus) return;
    if (!this.requireRisk("删除所选会话")) return;
    const threadIds = [...this.selectedThreadIds];
    if (threadIds.length === 0) {
      this.error = "删除前请先选择会话。";
      this.render();
      return;
    }
    await this.withBusy(async () => {
      const preview = await window.restoreApp.codexDelete({
        candidateId: this.codexStatus!.candidateId,
        threadIds,
        dryRun: true
      });
      this.lastDeletePreview = preview;
      this.render();
      const ok = this.confirmAction(
        "删除所选会话",
        `会话数量：${preview.selectedThreads}\n匹配 JSONL：${preview.matchedJsonlFiles}\n将执行软删除到 history_sync_deleted。`
      );
      if (!ok) return;

      const result = await window.restoreApp.codexDelete({
        candidateId: this.codexStatus!.candidateId,
        threadIds,
        dryRun: false
      });
      this.pushLog(
        "warning",
        `删除完成：数据库行 ${result.deletedDbRows}，移动 JSONL ${result.movedJsonlFiles}，移除索引 ${result.removedIndexRows}`
      );
      if (result.backupPath) this.pushLog("info", `删除备份：${result.backupPath}`);
      if (result.deletedDir) this.pushLog("info", `删除目录：${result.deletedDir}`);
      this.lastDeletePreview = null;
      await this.refreshCodexOnly();
    });
  }

  private async createBackup(): Promise<void> {
    if (!this.codexStatus) return;
    if (!this.requireRisk("创建手动备份")) return;
    if (!this.confirmAction("创建手动备份", "立即创建新的 state_5.sqlite 备份。")) return;
    await this.withBusy(async () => {
      const result = await window.restoreApp.codexBackupCreate({
        candidateId: this.codexStatus!.candidateId
      });
      this.pushLog("success", `备份创建成功：${result.backupPath}`);
      await this.refreshCodexOnly();
    });
  }

  private async restoreBackup(pathToRestore: string): Promise<void> {
    if (!this.codexStatus) return;
    if (!this.requireRisk("恢复备份")) return;
    if (!pathToRestore) {
      this.error = "请先选择备份文件。";
      this.render();
      return;
    }
    if (
      !this.confirmAction(
        "恢复备份",
        `将从以下路径恢复：\n${pathToRestore}\n恢复前会自动创建安全备份。`
      )
    ) {
      return;
    }
    await this.withBusy(async () => {
      const result = await window.restoreApp.codexBackupRestore({
        candidateId: this.codexStatus!.candidateId,
        backupPath: pathToRestore
      });
      this.pushLog("success", `恢复完成：${result.restoredFrom}`);
      this.pushLog("info", `安全备份：${result.safetyBackup}`);
      await this.refreshCodexOnly();
    });
  }

  private async openBackupDir(): Promise<void> {
    await this.withBusy(async () => {
      await window.restoreApp.openCodexBackup({ candidateId: this.codexStatus?.candidateId });
      this.pushLog("info", "已打开备份目录。");
    });
  }

  private async openDeletedDir(): Promise<void> {
    await this.withBusy(async () => {
      await window.restoreApp.openCodexDeleted({ candidateId: this.codexStatus?.candidateId });
      this.pushLog("info", "已打开删除目录。");
    });
  }

  private async runCursorDiagnose(): Promise<void> {
    if (!this.cursorCandidateId) return;
    await this.withBusy(async () => {
      this.cursorReport = await window.restoreApp.diagnoseEnvironment(this.cursorCandidateId);
      this.cursorPlan = null;
      this.cursorResult = null;
      this.cursorStage = "diagnose";
      this.pushLog("success", "Cursor 诊断完成。");
    });
  }

  private async runCursorPreview(): Promise<void> {
    if (!this.cursorCandidateId) return;
    await this.withBusy(async () => {
      this.cursorPlan = await window.restoreApp.previewRepair(this.cursorCandidateId);
      this.cursorResult = null;
      this.cursorStage = "preview";
      this.pushLog("success", "Cursor 预览已生成。");
    });
  }

  private async runCursorRepair(): Promise<void> {
    if (!this.cursorPlan) return;
    if (!this.requireRisk("Cursor 修复")) return;
    if (!this.confirmAction("执行 Cursor 修复", "该操作会写入 Cursor 的 state 数据库元数据。")) return;
    await this.withBusy(async () => {
      this.cursorResult = await window.restoreApp.applyRepair(this.cursorPlan!.planId);
      this.cursorStage = "repair";
      this.pushLog("success", `Cursor 修复完成。备份：${this.cursorResult.backupPath}`);
      await this.refreshAll();
    });
  }

  private async runCursorRestoreLatest(): Promise<void> {
    if (!this.cursorCandidateId) return;
    if (!this.requireRisk("Cursor 恢复备份")) return;
    if (!this.confirmAction("恢复 Cursor 最新备份", "将使用最新备份覆盖当前 Cursor 状态。")) return;
    await this.withBusy(async () => {
      const result = await window.restoreApp.restoreLatestBackup(this.cursorCandidateId);
      this.pushLog("success", `Cursor 已恢复：${result.restoredFrom}`);
      await this.refreshAll();
    });
  }

  private async openCursorBackupDir(): Promise<void> {
    if (!this.cursorCandidateId) return;
    await this.withBusy(async () => {
      await window.restoreApp.openBackupFolder(this.cursorCandidateId);
      this.pushLog("info", "已打开 Cursor 备份目录。");
    });
  }

  private prepareKeyboardAccessibility(): void {
    this.root.querySelectorAll<HTMLElement>("[data-row-id]").forEach((row) => {
      row.tabIndex = 0;
      row.setAttribute("aria-label", `会话行 ${row.dataset.rowId ?? ""}`);
      row.setAttribute("aria-selected", row.dataset.rowId === this.activeThreadId ? "true" : "false");
    });

    this.root.querySelectorAll<HTMLInputElement>("[data-thread-id]").forEach((checkbox) => {
      const parentRow = checkbox.closest("tr");
      const titleCell = parentRow?.querySelector("td:nth-child(2)")?.textContent?.trim() ?? checkbox.dataset.threadId ?? "";
      checkbox.setAttribute("aria-label", `选择会话 ${titleCell}`);
    });
  }

  private bindEvents(): void {
    const pick = (id: string): HTMLElement | null => this.root.querySelector(`[data-id="${id}"]`);

    pick("refresh")?.addEventListener("click", () => void this.refreshAll());
    pick("select-all")?.addEventListener("click", () => this.selectAll());
    pick("select-sync")?.addEventListener("click", () => this.selectNeedSync());
    pick("select-clear")?.addEventListener("click", () => this.clearSelection());
    pick("select-active-only")?.addEventListener("click", () => this.selectOnlyActive());
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
      checkbox.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      checkbox.addEventListener("change", () => {
        const id = checkbox.dataset.threadId ?? "";
        if (!id) return;
        if (checkbox.checked) this.selectedThreadIds.add(id);
        else this.selectedThreadIds.delete(id);
        if (this.threadFilter === "selected" || !this.patchSelectionUi(id)) {
          this.render();
        }
        this.focusThreadRow(id);
      });
    });

    this.root.querySelectorAll<HTMLElement>("[data-row-id]").forEach((row) => {
      row.addEventListener("click", () => {
        const id = row.dataset.rowId ?? "";
        if (!id) return;
        this.activateThread(id);
      });
      row.addEventListener("keydown", (event) => {
        const id = row.dataset.rowId ?? "";
        if (!id) return;
        if (event.key === "Enter") {
          event.preventDefault();
          this.activateThread(id, true);
          return;
        }
        if (event.key === " ") {
          event.preventDefault();
          this.toggleThreadSelection(id);
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          this.moveActiveThread(1);
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          this.moveActiveThread(-1);
        }
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

    const search = this.root.querySelector<HTMLInputElement>("[data-search]");
    search?.addEventListener("input", () => {
      this.threadQuery = search.value;
      this.render();
    });

    this.root.querySelectorAll<HTMLElement>("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = (btn.dataset.filter ?? "all") as ThreadFilter;
        this.threadFilter = filter;
        this.render();
      });
    });

    const sortSelect = this.root.querySelector<HTMLSelectElement>("[data-sort]");
    sortSelect?.addEventListener("change", () => {
      this.threadSort = sortSelect.value as ThreadSort;
      this.render();
    });

    pick("toggle-sort-direction")?.addEventListener("click", () => this.toggleSortDirection());
  }

  render(): void {
    const viewState: WorkbenchViewState = {
      busy: this.busy,
      error: this.error,
      logs: this.logs,
      riskAck: this.riskAck,
      patchJsonl: this.patchJsonl,
      codexStatus: this.codexStatus,
      filteredThreads: this.getFilteredThreads(),
      activeThread: this.getActiveThread(),
      selectedThreadIds: this.selectedThreadIds,
      selectedBackupPath: this.selectedBackupPath,
      activeThreadId: this.activeThreadId,
      threadQuery: this.threadQuery,
      threadFilter: this.threadFilter,
      threadSort: this.threadSort,
      sortDirection: this.sortDirection,
      cursorCandidates: this.cursorCandidates,
      cursorCandidateId: this.cursorCandidateId,
      cursorStage: this.cursorStage,
      cursorReport: this.cursorReport,
      cursorPlan: this.cursorPlan,
      cursorResult: this.cursorResult,
      lastDeletePreview: this.lastDeletePreview
    };

    ensureWorkbenchStyle();
    this.root.innerHTML = renderWorkbench(viewState);
    this.prepareKeyboardAccessibility();
    this.bindEvents();
  }
}
