import { runAppModelTests } from "./app-model.test.ts";

async function main(): Promise<void> {
  await runAppModelTests();
  console.log("PASS desktop app model");
}

main().catch((error) => {
  console.error("FAIL", error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
