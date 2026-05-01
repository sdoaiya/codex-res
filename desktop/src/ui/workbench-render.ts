import type { CodexThreadStatus, CodexCountRow, EnvironmentCandidate } from "../types.ts";
import { WORKBENCH_STYLE } from "./workbench-style.ts";
import type { CursorStage, WorkbenchViewState } from "./workbench-types.ts";
import { cursorStepList, cursorStepStateLabel, escapeHtml, formatTime, logLevelLabel, threadBadge } from "./workbench-utils.ts";

function renderThreadRows(state: WorkbenchViewState): string {
  if (state.filteredThreads.length === 0) {
    return `<tr><td colspan="10" class="cell-empty">当前筛选条件下没有会话</td></tr>`;
  }

  return state.filteredThreads
    .map((thread) => {
      const badge = threadBadge(thread);
      const active = thread.id === state.activeThreadId;
      return `
        <tr data-row-id="${escapeHtml(thread.id)}" class="${active ? "row-active" : ""}">
          <td><input type="checkbox" data-thread-id="${escapeHtml(thread.id)}" ${state.selectedThreadIds.has(thread.id) ? "checked" : ""} ${state.busy ? "disabled" : ""} /></td>
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

function renderThreadDetails(activeThread: CodexThreadStatus | null): string {
  if (!activeThread) return `<div class="cell-empty">请选择一行查看会话详情</div>`;

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
        `<div class="cursor-step ${step.state}"><div class="cursor-step-state">${escapeHtml(cursorStepStateLabel(step.state))}</div><div>${escapeHtml(step.label)}</div></div>`
    )
    .join("");
}

function renderLogs(logs: WorkbenchViewState["logs"]): string {
  if (logs.length === 0) return `<div class="cell-empty">暂无日志</div>`;
  return logs
    .map(
      (log) =>
        `<div class="log-row ${log.level}"><span class="log-time">${escapeHtml(log.time)}</span><span class="log-level">${escapeHtml(logLevelLabel(log.level))}</span><span class="log-message">${escapeHtml(log.message)}</span></div>`
    )
    .join("");
}

function renderDeletePreview(state: WorkbenchViewState): string {
  const preview = state.lastDeletePreview;
  if (!preview) {
    return `<p>删除前会自动生成预览。执行一次“删除所选”后将在这里展示影响摘要。</p>`;
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

function renderCodexPanel(state: WorkbenchViewState): string {
  const codex = state.codexStatus;
  const totalThreads = codex?.threads.length ?? 0;
  const needSyncCount = (codex?.threads ?? []).filter((thread) => thread.syncCandidate).length;
  const codexHome = codex?.codexHome ?? "未发现 Codex 环境";

  return `
    <section class="panel">
      <div class="section-head">
        <h2>Codex 控制台</h2>
        <button class="btn-soft" data-id="refresh" ${state.busy ? "disabled" : ""}>刷新</button>
      </div>
      <div class="muted">${escapeHtml(codexHome)}</div>

      <div class="kpis">
        <div class="kpi"><div class="v">${totalThreads}</div><div class="k">总会话</div></div>
        <div class="kpi"><div class="v">${codex?.visibleThreads ?? 0}</div><div class="k">可见</div></div>
        <div class="kpi"><div class="v">${codex?.movableThreads ?? 0}</div><div class="k">待同步</div></div>
        <div class="kpi"><div class="v">${state.selectedThreadIds.size}</div><div class="k">已选择</div></div>
        <div class="kpi"><div class="v">${state.filteredThreads.length}</div><div class="k">筛选结果</div></div>
      </div>

      <div class="section-title">选择操作</div>
      <div class="action-grid">
        <div class="toolbar">
          <button class="btn-soft" data-id="select-all" ${state.busy ? "disabled" : ""}>全选</button>
          <button class="btn-soft" data-id="select-sync" ${state.busy ? "disabled" : ""}>选择待同步 (${needSyncCount})</button>
          <button class="btn-soft" data-id="select-clear" ${state.busy ? "disabled" : ""}>清空选择</button>
          <button class="btn-soft" data-id="select-active-only" ${state.busy || !state.activeThreadId ? "disabled" : ""}>仅选当前</button>
        </div>
        <div class="toolbar danger-zone">
          <div class="danger-zone-title">高风险写入操作</div>
          <div class="danger-zone-tip">这些操作会写入或删除本地会话数据。执行前请确认已备份。</div>
          <button class="btn-primary danger-outline" data-id="sync-selected" ${state.busy ? "disabled" : ""}>同步所选</button>
          <button class="btn-primary danger-outline" data-id="sync-candidates" ${state.busy ? "disabled" : ""}>同步候选</button>
          <button class="btn-danger danger-outline" data-id="delete-selected" ${state.busy ? "disabled" : ""}>删除所选</button>
        </div>
      </div>

      <div class="section-title">风险控制</div>
      <div class="controls">
        <label><input type="checkbox" data-patch-jsonl ${state.patchJsonl ? "checked" : ""} ${state.busy ? "disabled" : ""} /> 同步时修复 JSONL 头</label>
        <label><input type="checkbox" data-risk ${state.riskAck ? "checked" : ""} ${state.busy ? "disabled" : ""} /> 我已了解风险并完成数据备份</label>
        <div class="risk-box">高风险写入会修改本地 SQLite/JSONL。执行写入前请关闭 Cursor 与 Codex。</div>
      </div>

      <div class="section-title">会话浏览</div>
      <div class="thread-controls">
        <input type="text" placeholder="搜索会话标题 / ID / Provider / 路径..." value="${escapeHtml(state.threadQuery)}" data-search ${state.busy ? "disabled" : ""} />
        <select data-sort ${state.busy ? "disabled" : ""}>
          <option value="updated" ${state.threadSort === "updated" ? "selected" : ""}>按更新时间</option>
          <option value="title" ${state.threadSort === "title" ? "selected" : ""}>按标题</option>
          <option value="provider" ${state.threadSort === "provider" ? "selected" : ""}>按 Provider</option>
        </select>
        <button class="btn-soft" data-id="toggle-sort-direction" ${state.busy ? "disabled" : ""}>排序方向：${state.sortDirection === "asc" ? "升序" : "降序"}</button>
        <div class="filter-row">
          <button class="filter-chip ${state.threadFilter === "all" ? "active" : ""}" data-filter="all" ${state.busy ? "disabled" : ""}>全部</button>
          <button class="filter-chip ${state.threadFilter === "need-sync" ? "active" : ""}" data-filter="need-sync" ${state.busy ? "disabled" : ""}>待同步</button>
          <button class="filter-chip ${state.threadFilter === "archived" ? "active" : ""}" data-filter="archived" ${state.busy ? "disabled" : ""}>仅归档</button>
          <button class="filter-chip ${state.threadFilter === "missing" ? "active" : ""}" data-filter="missing" ${state.busy ? "disabled" : ""}>数据缺失</button>
          <button class="filter-chip ${state.threadFilter === "selected" ? "active" : ""}" data-filter="selected" ${state.busy ? "disabled" : ""}>已选择</button>
        </div>
        <div class="kbd-hint">键盘支持：↑/↓ 切换会话，Enter 查看详情，Space 勾选/取消。</div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>选择</th><th>标题</th><th>数据库 Provider</th><th>模型</th><th>JSONL Provider</th><th>状态</th><th>更新时间</th><th>CWD</th><th>会话 ID</th>
            </tr>
          </thead>
          <tbody>${renderThreadRows(state)}</tbody>
        </table>
      </div>

      <section class="thread-detail">
        <h3>会话详情</h3>
        ${renderThreadDetails(state.activeThread)}
      </section>
    </section>
  `;
}

function renderOperationsPanel(state: WorkbenchViewState): string {
  const codex = state.codexStatus;
  const cursorPreview = state.cursorPlan
    ? `会话数=${state.cursorPlan.summary.threadCount}，SQLite 更新=${state.cursorPlan.summary.sqliteUpdates}，JSONL 更新=${state.cursorPlan.summary.jsonlUpdates}`
    : "暂无预览结果。";
  const cursorResult = state.cursorResult
    ? `已更新会话=${state.cursorResult.summary.updatedThreads}，JSONL=${state.cursorResult.summary.updatedJsonlFiles}，备份=${state.cursorResult.backupPath}`
    : "暂无修复结果。";

  return `
    <aside class="panel">
      <h2>操作台</h2>
      <div class="cards">
        <section class="card">
          <h3>备份工作台</h3>
          <select data-backup ${state.busy ? "disabled" : ""}>${renderBackups(state)}</select>
          <div class="toolbar">
            <button class="btn-soft" data-id="create-backup" ${state.busy ? "disabled" : ""}>创建备份</button>
            <button class="btn-warning danger-outline" data-id="restore-selected" ${state.busy ? "disabled" : ""}>恢复选中备份</button>
            <button class="btn-warning danger-outline" data-id="restore-latest" ${state.busy ? "disabled" : ""}>恢复最新备份</button>
            <button class="btn-soft" data-id="open-backups" ${state.busy ? "disabled" : ""}>打开备份目录</button>
            <button class="btn-soft" data-id="open-deleted" ${state.busy ? "disabled" : ""}>打开删除目录</button>
          </div>
        </section>

        <section class="card">
          <h3>删除预览摘要</h3>
          ${renderDeletePreview(state)}
        </section>

        <section class="card">
          <h3>上下文快照</h3>
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
        </section>

        <section class="card">
          <h3>Cursor 修复通道</h3>
          <select data-cursor ${state.busy ? "disabled" : ""}>${renderCursorOptions(state.cursorCandidates, state.cursorCandidateId)}</select>
          <div class="cursor-steps">${renderCursorStepLane(state.cursorStage)}</div>
          <div class="toolbar">
            <button class="btn-soft" data-id="cursor-diagnose" ${state.busy || !state.cursorCandidateId ? "disabled" : ""}>运行诊断</button>
            <button class="btn-soft" data-id="cursor-preview" ${state.busy || !state.cursorCandidateId ? "disabled" : ""}>生成预览</button>
            <button class="btn-primary danger-outline" data-id="cursor-repair" ${state.busy || !state.cursorPlan ? "disabled" : ""}>执行修复</button>
            <button class="btn-warning danger-outline" data-id="cursor-restore" ${state.busy || !state.cursorCandidateId ? "disabled" : ""}>恢复最新备份</button>
            <button class="btn-soft" data-id="cursor-open-backups" ${state.busy || !state.cursorCandidateId ? "disabled" : ""}>打开备份目录</button>
          </div>
          <div class="cards">
            <section class="card"><h3>诊断</h3>${renderCursorIssues(state)}</section>
            <section class="card"><h3>预览</h3><p>${escapeHtml(cursorPreview)}</p></section>
            <section class="card"><h3>结果</h3><p>${escapeHtml(cursorResult)}</p></section>
          </div>
        </section>

        <section class="card">
          <h3>操作日志</h3>
          <div class="log-box">${renderLogs(state.logs)}</div>
        </section>
      </div>
    </aside>
  `;
}

function renderStatusStrip(state: WorkbenchViewState): string {
  const codex = state.codexStatus;
  const total = codex?.threads.length ?? 0;
  const selected = state.selectedThreadIds.size;
  const stage = cursorStepList(state.cursorStage).find((step) => step.state === "current")?.label ?? "扫描";
  return `
    <div class="status-strip">
      <div class="status-item"><span>运行状态</span><strong>${state.busy ? "执行中" : "空闲"}</strong></div>
      <div class="status-item"><span>风险确认</span><strong>${state.riskAck ? "已确认" : "未确认"}</strong></div>
      <div class="status-item"><span>会话选择</span><strong>${selected} / ${total}</strong></div>
      <div class="status-item"><span>Cursor 阶段</span><strong>${escapeHtml(stage)}</strong></div>
    </div>
  `;
}

export function renderWorkbench(state: WorkbenchViewState): string {
  return `
    <style>${WORKBENCH_STYLE}</style>
    <div class="workbench">
      <header class="hero">
        <h1>Codex 恢复工作台</h1>
        <p>面向会话恢复、备份治理与 Cursor 修复的轻量桌面工作台。</p>
        ${renderStatusStrip(state)}
      </header>
      <div class="layout">
        ${renderCodexPanel(state)}
        ${renderOperationsPanel(state)}
      </div>
      ${state.busy ? `<div class="banner banner-busy">任务执行中...</div>` : ""}
      ${state.error ? `<div class="banner banner-error">${escapeHtml(state.error)}</div>` : ""}
    </div>
  `;
}
