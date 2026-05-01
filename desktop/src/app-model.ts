export type WorkflowStepId = "scan" | "diagnose" | "preview" | "repair";

export interface CandidateCardInput {
  product: "codex" | "cursor";
  rootPath: string;
  confidence: "low" | "medium" | "high";
  issueCount: number;
  recoverableThreadCount: number;
  threadCount: number;
  lastModifiedAt: string | null;
}

export interface CandidateCardSummary {
  title: string;
  subtitle: string;
  badges: string[];
  facts: string[];
}

export interface WorkflowStep {
  id: WorkflowStepId;
  label: string;
  status: "done" | "current" | "pending";
}

const stepOrder: WorkflowStepId[] = ["scan", "diagnose", "preview", "repair"];

export function buildWorkflowSteps(current: WorkflowStepId): WorkflowStep[] {
  const currentIndex = stepOrder.indexOf(current);
  return stepOrder.map((step, index) => ({
    id: step,
    label:
      step === "scan"
        ? "扫描环境"
        : step === "diagnose"
          ? "查看诊断"
          : step === "preview"
            ? "预览修复"
            : "执行并验证",
    status: index < currentIndex ? "done" : index === currentIndex ? "current" : "pending"
  }));
}

export function summarizeCandidateCard(candidate: CandidateCardInput): CandidateCardSummary {
  return {
    title: candidate.product === "codex" ? "Codex" : "Cursor",
    subtitle: candidate.rootPath,
    badges: [`${candidate.confidence} confidence`],
    facts: [
      `${candidate.recoverableThreadCount} / ${candidate.threadCount} recoverable`,
      `${candidate.issueCount} issues`,
      candidate.lastModifiedAt ? `updated ${candidate.lastModifiedAt}` : "updated unknown"
    ]
  };
}
