import type { CodexCountRow, CodexThreadStatus, EnvironmentCandidate } from "../types.ts";
import type { CursorStage, WorkbenchPanelState, WorkbenchViewState } from "./workbench-types.ts";
import {
  collapseActionLabel,
  cursorStepList,
  cursorStepStateLabel,
  escapeHtml,
  formatTime,
  logLevelLabel,
  riskAckLabel,
  riskChecklistItemLabel,
  riskChecklistStateLabel,
  riskChecklistSummary,
  threadBadge
} from "./workbench-utils.ts";

function renderThreadRows(state: WorkbenchViewState): string {
  if (state.filteredThreads.length === 0) {
    return `<tr><td colspan="9" class="cell-empty">当前筛选条件下没有会话</td></tr>`;
  }

  return state.filteredThreads
    .map((thread) => {
      const badge = threadBadge(thread);
      const active = thread.id === state.activeThreadId;
      return `
        <tr data-row-id="${escapeHtml(thread.id)}" class="${active ? "row-active" : ""}">
          <td>
            <input
              type="checkbox"
              data-thread-id="${escapeHtml(thread.id)}"
              ${state.selectedThreadIds.has(thread.id) ? "checked" : ""}
              ${state.busy ? "disabled" : ""}
            />
          </td>
          <td title="${escapeHtml(thread.title)}">${escapeHtml(thread.title)}</td>
          <td>${escapeHtml(thread.provider || "-")}</td>
          <td>${escapeHtml(thread.model || "-")}</td>
          <td>${escapeHtml(thread.jsonlProvider || "-")}</td>
          <td><span class="state-pill ${badge.tone}">${escapeHtml(badge.label)}</span></td>
          <td>${escapeHtml(formatTime(thread.updatedAt))}</td>
          <td title="${escapeHtml(thread.cwd || "-")}">${escapeHtml(thread.cwd || "-")}</td>
          <td class="mono" title="${escapeHtml(thread.id)}">${escapeHtml(thread.id)}</td>
        </tr>
      `;
    })
    .join("");
}

export function renderThreadDetails(activeThread: CodexThreadStatus | null): string {
  if (!activeThread) return `<div class="cell-empty">请选择一条会话查看详情</div>`;

  const status = threadBadge(activeThread).label;
  return `
    <div class="thread-meta-grid">
      <div><span>会话 ID</span><strong class="mono">${escapeHtml(activeThread.id)}</strong></div>
      <div><span>状态</span><strong>${escapeHtml(status)}</strong></div>
      <div><span>数据库 Provider</span><strong>${escapeHtml(activeThread.provider || "-")}</strong></div>
      <div><span>模型</span><strong>${escapeHtml(activeThread.model || "-")}</strong></div>
      <div><span>JSONL Provider</span><strong>${escapeHtml(activeThread.jsonlProvider || "-")}</strong></div>
      <div><span>更新时间</span><strong>${escapeHtml(formatTime(activeThread.updatedAt))}</strong></div>
      <div class="wide"><span>CWD</span><strong class="mono">${escapeHtml(activeThread.cwd || "-")}</strong></div>
      <div class="wide"><span>Rollout 路径</span><strong class="mono">${escapeHtml(activeThread.rolloutPath || "-")}</strong></div>
      <div class="wide"><span>JSONL 路径</span><strong class="mono">${escapeHtml(activeThread.jsonlPaths.join(" | ") || "-")}</strong></div>
    </div>
  `;
}

function renderBackups(state: WorkbenchViewState): string {
  const codex = state.codexStatus;
  if (!codex?.backups.length) return `<option value="">暂无可用备份</option>`;
  return codex.backups
    .map(
      (backup) =>
        `<option value="${escapeHtml(backup.path)}" ${state.selectedBackupPath === backup.path ? "selected" : ""}>${escapeHtml(backup.modifiedAt)} | ${escapeHtml(backup.name)}</option>`
    )
    .join("");
}

function renderDistribution(items: CodexCountRow[]): string {
  if (items.length === 0) return "<li>-</li>";
  return items.map((item) => `<li>${escapeHtml(item.key)}: ${item.count}</li>`).join("");
}

function renderCursorOptions(candidates: EnvironmentCandidate[], selectedId: string): string {
  if (candidates.length === 0) return `<option value="">未发现 Cursor 环境</option>`;
  return candidates
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}" ${selectedId === item.id ? "selected" : ""}>${escapeHtml(item.rootPath)}</option>`
    )
    .join("");
}

function renderCursorIssues(state: WorkbenchViewState): string {
  if (!state.cursorReport?.issues.length) return "<p>暂无诊断结果。</p>";
  return `<ul class="compact-list">${state.cursorReport.issues
    .map((issue) => `<li><strong>${escapeHtml(issue.code)}</strong>: ${escapeHtml(issue.message)}</li>`)
    .join("")}</ul>`;
}

function renderCursorStepLane(stage: CursorStage): string {
  return cursorStepList(stage)
    .map(
      (step) =>
        `<div class="cursor-step ${step.state}">
          <div class="cursor-step-state">${escapeHtml(cursorStepStateLabel(step.state))}</div>
          <div>${escapeHtml(step.label)}</div>
        </div>`
    )
    .join("");
}

function renderLogsRows(state: WorkbenchViewState): string {
  if (state.logs.length === 0) return `<div class="cell-empty">暂无日志</div>`;
  return state.logs
    .map((log, index) => {
      const hidden = !state.logsExpanded && index >= 3;
      return `<div class="log-row ${log.level}" data-log-row ${hidden ? "hidden" : ""}>
        <span class="log-time">${escapeHtml(log.time)}</span>
        <span class="log-level">${escapeHtml(logLevelLabel(log.level))}</span>
        <span class="log-message">${escapeHtml(log.message)}</span>
      </div>`;
    })
    .join("");
}

function renderDeletePreview(state: WorkbenchViewState): string {
  const preview = state.lastDeletePreview;
  if (!preview) {
    return `<p>删除前会先自动生成预览。执行一次“删除所选”后会在这里展示影响摘要。</p>`;
  }
  return `
    <div class="meta-line"><span>选中会话</span><strong>${preview.selectedThreads}</strong></div>
    <div class="meta-line"><span>匹配 JSONL</span><strong>${preview.matchedJsonlFiles}</strong></div>
    <div class="meta-line"><span>数据库删除行</span><strong>${preview.deletedDbRows}</strong></div>
    <div class="meta-line"><span>移动文件数</span><strong>${preview.movedJsonlFiles}</strong></div>
    <div class="meta-line"><span>索引移除行</span><strong>${preview.removedIndexRows}</strong></div>
    <div class="muted">预览模式：${preview.dryRun ? "是" : "否"}，确认后才会执行真实写入。</div>
  `;
}

function resolvePanels(state: WorkbenchViewState): WorkbenchPanelState {
  const fallback: WorkbenchPanelState = {
    backup: true,
    deletePreview: false,
    snapshot: false,
    cursor: true,
    logs: false
  };
  return { ...fallback, ...state.operationPanels };
}

function renderPanelCard(
  key: keyof WorkbenchPanelState,
  title: string,
  open: boolean,
  body: string,
  state: WorkbenchViewState
): string {
  return `
    <section class="card card-collapsible" data-collapsed="${open ? "0" : "1"}">
      <div class="card-head">
        <h3>${title}</h3>
        <button
          type="button"
          class="btn-soft btn-mini"
          data-toggle-panel="${key}"
          aria-expanded="${open ? "true" : "false"}"
          data-open="${open ? "1" : "0"}"
          ${state.busy ? "disabled" : ""}
        >${collapseActionLabel(open)}</button>
      </div>
      <div class="card-body" data-panel="${key}" ${open ? "" : "hidden"}>
        ${body}
      </div>
    </section>
  `;
}

function renderRiskChecklist(state: WorkbenchViewState): string {
  const checklist = state.riskChecklist;
  const allReady = checklist.appsClosed && checklist.backupReady;
  return `
    <section class="risk-checklist">
      <div class="meta-line">
        <span>总确认</span>
        <strong>${riskAckLabel(state.riskAck)}</strong>
      </div>
      <div class="check-row">
        <label>
          <input type="checkbox" data-risk-apps-closed ${checklist.appsClosed ? "checked" : ""} ${state.busy ? "disabled" : ""} />
          ${riskChecklistItemLabel("appsClosed")}
        </label>
        <span class="check-state">${riskChecklistStateLabel(checklist.appsClosed)}</span>
      </div>
      <div class="check-row">
        <label>
          <input type="checkbox" data-risk-backup-ready ${checklist.backupReady ? "checked" : ""} ${state.busy ? "disabled" : ""} />
          ${riskChecklistItemLabel("backupReady")}
        </label>
        <span class="check-state">${riskChecklistStateLabel(checklist.backupReady)}</span>
      </div>
      <div class="check-row">
        <label>
          <input type="checkbox" data-risk ${state.riskAck ? "checked" : ""} ${state.busy ? "disabled" : ""} />
          我已了解风险并允许写入变更
        </label>
      </div>
      <label class="patch-toggle">
        <input type="checkbox" data-patch-jsonl ${state.patchJsonl ? "checked" : ""} ${state.busy ? "disabled" : ""} />
        同步时修复 JSONL 头部
      </label>
      <div class="risk-box">
        <div>${riskChecklistSummary(checklist)}</div>
        <div>风控状态：<strong data-bind="risk-status">${allReady && state.riskAck ? "已确认" : "未确认"}</strong></div>
      </div>
    </section>
  `;
}

function renderThreadSection(state: WorkbenchViewState): string {
  return `
    <section class="card section-block">
      <div class="card-head">
        <h3>会话工作区</h3>
        <span class="muted">主区域：筛选、选择、查看详情</span>
      </div>

      <div class="thread-controls">
        <input
          type="text"
          placeholder="搜索会话标题 / ID / Provider / 路径..."
          value="${escapeHtml(state.threadQuery)}"
          data-search
          ${state.busy ? "disabled" : ""}
        />
        <select data-sort ${state.busy ? "disabled" : ""}>
          <option value="updated" ${state.threadSort === "updated" ? "selected" : ""}>按更新时间</option>
          <option value="title" ${state.threadSort === "title" ? "selected" : ""}>按标题</option>
          <option value="provider" ${state.threadSort === "provider" ? "selected" : ""}>按 Provider</option>
        </select>
        <button class="btn-soft" data-id="toggle-sort-direction" ${state.busy ? "disabled" : ""}>
          排序方向：${state.sortDirection === "asc" ? "升序" : "降序"}
        </button>
        <div class="filter-row">
          <button class="filter-chip ${state.threadFilter === "all" ? "active" : ""}" data-filter="all" ${state.busy ? "disabled" : ""}>全部</button>
          <button class="filter-chip ${state.threadFilter === "need-sync" ? "active" : ""}" data-filter="need-sync" ${state.busy ? "disabled" : ""}>待同步</button>
          <button class="filter-chip ${state.threadFilter === "archived" ? "active" : ""}" data-filter="archived" ${state.busy ? "disabled" : ""}>仅归档</button>
          <button class="filter-chip ${state.threadFilter === "missing" ? "active" : ""}" data-filter="missing" ${state.busy ? "disabled" : ""}>数据缺失</button>
          <button class="filter-chip ${state.threadFilter === "selected" ? "active" : ""}" data-filter="selected" ${state.busy ? "disabled" : ""}>已选择</button>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>选择</th>
              <th>标题</th>
              <th>数据库 Provider</th>
              <th>模型</th>
              <th>JSONL Provider</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>CWD</th>
              <th>会话 ID</th>
            </tr>
          </thead>
          <tbody>${renderThreadRows(state)}</tbody>
        </table>
      </div>

      <section class="thread-detail">
        <h3>会话详情</h3>
        <div data-bind="thread-detail-body">${renderThreadDetails(state.activeThread)}</div>
      </section>
    </section>
  `;
}

function renderBatchSection(state: WorkbenchViewState, needSyncCount: number): string {
  return `
    <section class="card">
      <div class="card-head">
        <h3>批量操作</h3>
        <span class="muted">先选会话，再执行写入</span>
      </div>
      <div class="action-grid">
        <div class="toolbar">
          <button class="btn-soft" data-id="select-all" ${state.busy ? "disabled" : ""}>全选</button>
          <button class="btn-soft" data-id="select-sync" ${state.busy ? "disabled" : ""}>选择待同步 (${needSyncCount})</button>
          <button class="btn-soft" data-id="select-clear" ${state.busy ? "disabled" : ""}>清空选择</button>
          <button class="btn-soft" data-id="select-active-only" ${state.busy || !state.activeThreadId ? "disabled" : ""}>仅选当前</button>
        </div>
        <div class="danger-zone">
          <div class="danger-zone-title">写入与删除</div>
          <div class="danger-zone-tip">以下操作会改动本地 SQLite / JSONL 数据。</div>
          <div class="toolbar">
            <button class="btn-primary danger-outline" data-id="sync-selected" data-requires-risk ${state.busy ? "disabled" : ""}>同步所选</button>
            <button class="btn-primary danger-outline" data-id="sync-candidates" data-requires-risk ${state.busy ? "disabled" : ""}>同步候选</button>
            <button class="btn-danger danger-outline" data-id="delete-selected" data-requires-risk ${state.busy ? "disabled" : ""}>删除所选</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderRiskSection(state: WorkbenchViewState): string {
  return `
    <section class="card">
      <div class="card-head">
        <h3>风险控制</h3>
        <span class="muted">三项确认通过后才可写入</span>
      </div>
      ${renderRiskChecklist(state)}
    </section>
  `;
}

function renderCodexPanel(state: WorkbenchViewState): string {
  const codex = state.codexStatus;
  const totalThreads = codex?.threads.length ?? 0;
  const needSyncCount = (codex?.threads ?? []).filter((thread) => thread.syncCandidate).length;
  const codexHome = codex?.codexHome ?? "未发现 Codex 环境";

  return `
    <main class="panel">
      <div class="section-head">
        <h2>Codex 会话工作台</h2>
        <div class="codex-head-right">
          <span class="muted path-line path-line-inline">${escapeHtml(codexHome)}</span>
          <button class="btn-soft" data-id="refresh" ${state.busy ? "disabled" : ""}>刷新</button>
        </div>
      </div>

      <div class="kpis">
        <div class="kpi"><div class="v">${totalThreads}</div><div class="k">总会话</div></div>
        <div class="kpi"><div class="v">${codex?.visibleThreads ?? 0}</div><div class="k">可见</div></div>
        <div class="kpi"><div class="v">${needSyncCount}</div><div class="k">待同步</div></div>
        <div class="kpi"><div class="v" data-bind="kpi-selected">${state.selectedThreadIds.size}</div><div class="k">已选择</div></div>
        <div class="kpi"><div class="v">${state.filteredThreads.length}</div><div class="k">筛选结果</div></div>
        <div class="kpi"><div class="v">${codex?.movableThreads ?? 0}</div><div class="k">可修复</div></div>
      </div>

      <div class="action-grid section-block">
        ${renderBatchSection(state, needSyncCount)}
        ${renderRiskSection(state)}
      </div>

      ${renderThreadSection(state)}
    </main>
  `;
}

function renderOperationsPanel(state: WorkbenchViewState): string {
  const codex = state.codexStatus;
  const panels = resolvePanels(state);
  const visibleLogCount = state.logsExpanded ? state.logs.length : Math.min(state.logs.length, 3);
  const cursorPreview = state.cursorPlan
    ? `会话数 ${state.cursorPlan.summary.threadCount}，SQLite 更新 ${state.cursorPlan.summary.sqliteUpdates}，JSONL 更新 ${state.cursorPlan.summary.jsonlUpdates}`
    : "暂无预览结果。";
  const cursorResult = state.cursorResult
    ? `已更新会话 ${state.cursorResult.summary.updatedThreads}，JSONL ${state.cursorResult.summary.updatedJsonlFiles}，备份 ${state.cursorResult.backupPath}`
    : "暂无修复结果。";

  const backupBody = `
    <select data-backup ${state.busy ? "disabled" : ""}>${renderBackups(state)}</select>
    <div class="toolbar">
      <button class="btn-soft" data-id="create-backup" data-requires-risk ${state.busy ? "disabled" : ""}>创建备份</button>
      <button class="btn-warning danger-outline" data-id="restore-selected" data-requires-risk ${state.busy ? "disabled" : ""}>恢复选中备份</button>
      <button class="btn-warning danger-outline" data-id="restore-latest" data-requires-risk ${state.busy ? "disabled" : ""}>恢复最新备份</button>
      <button class="btn-soft" data-id="open-backups" ${state.busy ? "disabled" : ""}>打开备份目录</button>
      <button class="btn-soft" data-id="open-deleted" ${state.busy ? "disabled" : ""}>打开删除目录</button>
    </div>
  `;

  const snapshotBody = `
    <div class="meta-line"><span>Provider</span><strong>${escapeHtml(codex?.currentProvider ?? "-")}</strong></div>
    <div class="meta-line"><span>模型</span><strong>${escapeHtml(codex?.currentModel ?? "-")}</strong></div>
    <div class="stats-grid">
      <div>
        <div class="muted">Provider 分布</div>
        <ul class="compact-list">${renderDistribution(codex?.providerCounts ?? [])}</ul>
      </div>
      <div>
        <div class="muted">模型分布</div>
        <ul class="compact-list">${renderDistribution(codex?.modelCounts ?? [])}</ul>
      </div>
    </div>
  `;

  const cursorBody = `
    <select data-cursor ${state.busy ? "disabled" : ""}>${renderCursorOptions(state.cursorCandidates, state.cursorCandidateId)}</select>
    <div class="cursor-steps">${renderCursorStepLane(state.cursorStage)}</div>
    <div class="toolbar">
      <button class="btn-soft" data-id="cursor-diagnose" ${state.busy || !state.cursorCandidateId ? "disabled" : ""}>运行诊断</button>
      <button class="btn-soft" data-id="cursor-preview" ${state.busy || !state.cursorCandidateId ? "disabled" : ""}>生成预览</button>
      <button class="btn-primary danger-outline" data-id="cursor-repair" data-requires-risk ${state.busy || !state.cursorPlan ? "disabled" : ""}>执行修复</button>
      <button class="btn-warning danger-outline" data-id="cursor-restore" data-requires-risk ${state.busy || !state.cursorCandidateId ? "disabled" : ""}>恢复最新备份</button>
      <button class="btn-soft" data-id="cursor-open-backups" ${state.busy || !state.cursorCandidateId ? "disabled" : ""}>打开备份目录</button>
    </div>
    <div class="cards stacked">
      <section class="mini-card"><h4>诊断</h4>${renderCursorIssues(state)}</section>
      <section class="mini-card"><h4>预览</h4><p>${escapeHtml(cursorPreview)}</p></section>
      <section class="mini-card"><h4>结果</h4><p>${escapeHtml(cursorResult)}</p></section>
    </div>
  `;

  const logsBody = `
    <div class="meta-line"><span>当前显示</span><strong data-bind="log-visible-count">${visibleLogCount}</strong></div>
    <div class="log-box">${renderLogsRows(state)}</div>
    <input type="checkbox" data-logs-expanded ${state.logsExpanded ? "checked" : ""} hidden />
    <button
      type="button"
      class="btn-soft"
      data-id="toggle-logs-expanded"
      data-expand-label="展开全部日志"
      data-collapse-label="收起日志"
      aria-expanded="${state.logsExpanded ? "true" : "false"}"
      ${state.busy ? "disabled" : ""}
    >${state.logsExpanded ? "收起日志" : "展开全部日志"}</button>
  `;

  return `
    <aside class="panel operations-panel">
      <div class="section-head">
        <h2>侧边操作</h2>
        <span class="muted">备份、修复、日志</span>
      </div>
      <div class="cards">
        ${renderPanelCard("backup", "备份工作台", panels.backup, backupBody, state)}
        ${renderPanelCard("deletePreview", "删除预览摘要", panels.deletePreview, renderDeletePreview(state), state)}
        ${renderPanelCard("snapshot", "上下文快照", panels.snapshot, snapshotBody, state)}
        ${renderPanelCard("cursor", "Cursor 修复通道", panels.cursor, cursorBody, state)}
        ${renderPanelCard("logs", "操作日志", panels.logs, logsBody, state)}
      </div>
    </aside>
  `;
}

function renderControlStrip(state: WorkbenchViewState): string {
  const total = state.codexStatus?.threads.length ?? 0;
  const selected = state.selectedThreadIds.size;
  const stage = cursorStepList(state.cursorStage).find((step) => step.state === "current")?.label ?? "扫描";
  const checklist = state.riskChecklist;
  const riskDone = state.riskAck && checklist.appsClosed && checklist.backupReady;
  const recoverable = state.codexStatus?.movableThreads ?? 0;
  return `
    <div class="control-strip">
      <div class="status-item status-inline">
        <span>阶段</span>
        <strong>${escapeHtml(stage)}</strong>
      </div>
      <div class="status-item status-inline">
        <span>已选</span>
        <strong data-bind="status-selected">${selected} / ${total}</strong>
      </div>
      <div class="status-item status-inline">
        <span>风控</span>
        <strong data-bind="risk-status">${riskDone ? "已确认" : "未确认"}</strong>
      </div>
      <div class="status-item status-inline">
        <span>可修复</span>
        <strong>${recoverable}</strong>
      </div>
    </div>
  `;
}

export function renderWorkbench(state: WorkbenchViewState): string {
  return `
    <div class="workbench" data-busy="${state.busy ? "1" : "0"}">
      <div class="app-shell">
        <header class="topbar">
          <div class="section-head">
            <h1>会话修复工作台</h1>
            <div class="toolbar">
              <span class="topbar-tag">Codex + Cursor 本地恢复</span>
              <span class="topbar-tag" data-bind="chrome-busy">${state.busy ? "任务执行中" : "就绪"}</span>
            </div>
          </div>
          ${renderControlStrip(state)}
        </header>

        <div class="layout">
          ${renderCodexPanel(state)}
          ${renderOperationsPanel(state)}
        </div>

        <div class="banner banner-busy" data-bind="busy-banner" ${state.busy ? "" : "hidden"}>任务执行中...</div>
        <div class="banner banner-error" data-bind="error-banner" ${state.error ? "" : "hidden"}>${escapeHtml(state.error)}</div>
      </div>
    </div>
  `;
}
