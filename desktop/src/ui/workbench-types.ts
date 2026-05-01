import type {
  CodexDeleteResult,
  CodexStatusReport,
  CodexThreadStatus,
  DiagnosisReport,
  EnvironmentCandidate,
  RepairPlan,
  RepairResult
} from "../types.ts";

export type CursorStage = "scan" | "diagnose" | "preview" | "repair";
export type LogLevel = "info" | "success" | "warning" | "error";
export type ThreadFilter = "all" | "need-sync" | "archived" | "missing" | "selected";
export type ThreadSort = "updated" | "title" | "provider";
export type SortDirection = "asc" | "desc";

export interface UiLog {
  id: number;
  time: string;
  level: LogLevel;
  message: string;
}

export interface WorkbenchViewState {
  busy: boolean;
  error: string;
  logs: UiLog[];
  riskAck: boolean;
  patchJsonl: boolean;
  codexStatus: CodexStatusReport | null;
  filteredThreads: CodexThreadStatus[];
  activeThread: CodexThreadStatus | null;
  selectedThreadIds: ReadonlySet<string>;
  selectedBackupPath: string;
  activeThreadId: string;
  threadQuery: string;
  threadFilter: ThreadFilter;
  threadSort: ThreadSort;
  sortDirection: SortDirection;
  cursorCandidates: EnvironmentCandidate[];
  cursorCandidateId: string;
  cursorStage: CursorStage;
  cursorReport: DiagnosisReport | null;
  cursorPlan: RepairPlan | null;
  cursorResult: RepairResult | null;
  lastDeletePreview: CodexDeleteResult | null;
}
