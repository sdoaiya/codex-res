import assert from "node:assert/strict";

import { buildWorkflowSteps, summarizeCandidateCard } from "./app-model.ts";

export async function runAppModelTests(): Promise<void> {
  const steps = buildWorkflowSteps("preview");
  assert.deepEqual(
    steps.map((step) => `${step.id}:${step.status}`),
    [
      "scan:done",
      "diagnose:done",
      "preview:current",
      "repair:pending"
    ]
  );

  const summary = summarizeCandidateCard({
    product: "codex",
    rootPath: "C:\\Users\\demo\\.codex",
    confidence: "high",
    issueCount: 4,
    recoverableThreadCount: 8,
    threadCount: 10,
    lastModifiedAt: "2026-05-01T14:00:00.000Z"
  });

  assert.equal(summary.title, "Codex");
  assert.equal(summary.badges[0], "high confidence");
  assert.equal(summary.facts[0], "8 / 10 recoverable");
  assert.equal(summary.facts[1], "4 issues");
}
