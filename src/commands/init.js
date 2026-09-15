import { run, commandExists } from "../lib/shell.js";
import { writeJson, readJson, STATE_FILE } from "../lib/state.js";

const CONTAINER_NAME = "soroban-sandbox-node";
const IMAGE = "stellar/quickstart:latest";
const RPC_PORT = 8000;
const NETWORK_PASSPHRASE = "Standalone Network ; February 2017";

export async function initCommand() {
  const existing = await readJson(STATE_FILE);
  if (existing?.running) {
    console.log(
      `Sandbox already running (container: ${existing.containerName}). Run 'sandbox reset' first if you want a clean one.`
    );
    return;
  }

  const hasDocker = await commandExists("docker");
  if (!hasDocker) {
    console.error("Docker is required but was not found on PATH. Install Docker and try again.");
    process.exitCode = 1;
    return;
  }

  console.log(`Starting local Stellar/Soroban node (${IMAGE})...`);

  await run("docker", [
    "run", "-d", "--rm",
    "--name", CONTAINER_NAME,
    "-p", `${RPC_PORT}:8000`,
    IMAGE,
    "--standalone",
    "--enable-soroban-rpc",
  ]);

  const rpcUrl = `http://localhost:${RPC_PORT}/soroban/rpc`;
  const healthy = await waitForHealthy(rpcUrl);

  if (!healthy) {
    console.error(`Node did not become healthy in time. Check 'docker logs ${CONTAINER_NAME}'.`);
    process.exitCode = 1;
    return;
  }

  await writeJson(STATE_FILE, {
    running: true,
    containerName: CONTAINER_NAME,
    rpcUrl,
    networkPassphrase: NETWORK_PASSPHRASE,
    startedAt: new Date().toISOString(),
  });

  console.log(`Sandbox is up.\n  RPC: ${rpcUrl}\n  Network passphrase: ${NETWORK_PASSPHRASE}`);
}

async function waitForHealthy(rpcUrl, { retries = 30, delayMs = 2000 } = {}) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
      });
      if (res.ok) {
        const body = await res.json();
        if (body?.result?.status === "healthy") return true;
      }
    } catch {
      // node isn't accepting connections yet, keep polling
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}
