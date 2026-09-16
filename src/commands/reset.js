import { run } from "../lib/shell.js";
import { clearState, sandboxDirExists, readJson, STATE_FILE } from "../lib/state.js";

// Falls back to the standard local container name for the dry-run preview
// and when there's no recorded state to read (e.g. state.json got deleted
// by hand); a running remote-network sandbox records containerName: null
// and nothing docker-related is attempted for it.
const DEFAULT_CONTAINER_NAME = "soroban-sandbox-node";

export async function resetCommand(options = {}) {
  const state = await readJson(STATE_FILE, null, options.cwd);
  const containerName = state ? state.containerName : DEFAULT_CONTAINER_NAME;

  if (options.dryRun) {
    const hasState = await sandboxDirExists(options.cwd);
    console.log("Dry run -- would perform:");
    console.log(containerName ? `  docker stop ${containerName}` : "  (no local container to stop)");
    console.log(hasState ? "  rm -rf .sandbox/ (state, accounts, contract records)" : "  (no .sandbox/ to remove)");
    console.log("Nothing was changed.");
    return;
  }

  if (containerName) {
    console.log("Stopping sandbox container (if running)...");
    await run("docker", ["stop", containerName], { allowFailure: true, silent: true });
  }
  await clearState(options.cwd);
  console.log("Sandbox reset. Run `sandbox init` to start fresh.");
}
