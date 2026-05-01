import { runCodexRepairTests } from "./codex-repair.test.ts";
import { runCodexConsoleTests } from "./codex-console.test.ts";
import { runCursorRepairTests } from "./cursor-repair.test.ts";
import { runScanEnvironmentTests } from "./scan-environments.test.ts";

async function main(): Promise<void> {
  const suites = [
    ["scanEnvironments", runScanEnvironmentTests],
    ["codexRepair", runCodexRepairTests],
    ["codexConsole", runCodexConsoleTests],
    ["cursorRepair", runCursorRepairTests]
  ] as const;

  let passed = 0;
  for (const [name, run] of suites) {
    await run();
    console.log("PASS", name);
    passed += 1;
  }

  console.log(`Completed ${passed} test suite(s).`);
}

main().catch((error) => {
  console.error("FAIL", error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
