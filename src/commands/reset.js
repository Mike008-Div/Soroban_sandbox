import { run } from "../lib/shell.js";
import { clearState, sandboxDirExists } from "../lib/state.js";

const CONTAINER_NAME = "soroban-sandbox-node";

export async function resetCommand(options = {}) {
  if (options.dryRun) {
    const hasState = await sandboxDirExists(options.cwd);
    console.log("Dry run -- would perform:");
    console.log(`  docker stop ${CONTAINER_NAME}`);
    console.log(hasState ? "  rm -rf .sandbox/ (state, accounts, contract records)" : "  (no .sandbox/ to remove)");
    console.log("Nothing was changed.");
    return;
  }

  console.log("Stopping sandbox container (if running)...");
  await run("docker", ["stop", CONTAINER_NAME], { allowFailure: true, silent: true });
  await clearState();
  console.log("Sandbox reset. Run `sandbox init` to start fresh.");
}
