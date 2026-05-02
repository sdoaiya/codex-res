import type { CodexThreadStatus } from "../types.ts";
import type { CursorStage, LogLevel, RiskChecklistState } from "./workbench-types.ts";

const cursorLabels: Record<CursorStage, string> = {
  scan: "扫描",
  diagnose: "诊断",
  preview: "预览",
  repair: "修复"
};

const riskChecklistLabels: Record<keyof RiskChecklistState, string> = {
  appsClosed: "已关闭 Codex / Cursor",
  backupReady: "已完成备份"
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function nowText(): string {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

export function formatTime(value: string | null): string {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString("zh-CN", { hour12: false });
}

export function threadBadge(thread: CodexThreadStatus): { label: string; tone: "ok" | "warn" | "danger" } {
  if (thread.status.includes("missing-db") || thread.status.includes("missing-jsonl")) {
    return { label: "数据缺失", tone: "danger" };
  }
  if (thread.syncCandidate) return { label: "待同步", tone: "warn" };
  if (thread.archived !== 0) return { label: "仅归档", tone: "warn" };
  return { label: "正常", tone: "ok" };
}

export function cursorStepList(
  stage: CursorStage
): Array<{ key: CursorStage; label: string; state: "done" | "current" | "pending" }> {
  const order: CursorStage[] = ["scan", "diagnose", "preview", "repair"];
  const idx = order.indexOf(stage);
  return order.map((key, i) => ({
    key,
    label: cursorLabels[key],
    state: i < idx ? "done" : i === idx ? "current" : "pending"
  }));
}

export function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function cursorStepStateLabel(state: "done" | "current" | "pending"): string {
  if (state === "done") return "已完成";
  if (state === "current") return "进行中";
  return "待执行";
}

export function logLevelLabel(level: LogLevel): string {
  if (level === "info") return "信息";
  if (level === "success") return "成功";
  if (level === "warning") return "警告";
  return "错误";
}

export function riskAckLabel(acknowledged: boolean): string {
  return acknowledged ? "已确认" : "未确认";
}

export function riskChecklistItemLabel(item: keyof RiskChecklistState): string {
  return riskChecklistLabels[item];
}

export function riskChecklistStateLabel(done: boolean): string {
  return done ? "已满足" : "未满足";
}

export function riskChecklistSummary(checklist: RiskChecklistState): string {
  const complete = Object.values(checklist).every(Boolean);
  return complete ? "风控前置检查已完成" : "风控前置检查未完成";
}

export function collapseStateLabel(expanded: boolean): string {
  return expanded ? "已展开" : "已收起";
}

export function collapseActionLabel(expanded: boolean): string {
  return expanded ? "收起" : "展开";
}
