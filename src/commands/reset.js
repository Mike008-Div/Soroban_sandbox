import { run } from "../lib/shell.js";
import { clearState } from "../lib/state.js";

const CONTAINER_NAME = "soroban-sandbox-node";

export async function resetCommand() {
  console.log("Stopping sandbox container (if running)...");
  await run("docker", ["stop", CONTAINER_NAME], { allowFailure: true, silent: true });
  await clearState();
  console.log("Sandbox reset. Run `sandbox init` to start fresh.");
}
