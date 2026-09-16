import { run, commandExists } from "../lib/shell.js";
import { writeJson, readJson, STATE_FILE } from "../lib/state.js";
import { warnIfSandboxDirNotGitignored } from "../lib/gitignore.js";

const CONTAINER_NAME = "soroban-sandbox-node";
const IMAGE = "stellar/quickstart:latest";
const RPC_PORT = 8000;
const NETWORK_PASSPHRASE = "Standalone Network ; February 2017";

export async function initCommand(options = {}) {
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

  const retries = parsePositiveInt(options.healthRetries, 30, "--health-retries");
  const delayMs = parsePositiveInt(options.healthDelay, 2000, "--health-delay");
  const port = parsePositiveInt(options.port, RPC_PORT, "--port");
  if (retries === undefined || delayMs === undefined || port === undefined) {
    process.exitCode = 1;
    return;
  }

  console.log(`Starting local Stellar/Soroban node (${IMAGE}) on port ${port}...`);

  await run("docker", buildRunArgs(port));

  const rpcUrl = `http://localhost:${port}/soroban/rpc`;
  const healthy = await waitForHealthy(rpcUrl, { retries, delayMs });

  if (!healthy) {
    const waited = ((retries * delayMs) / 1000).toFixed(0);
    console.error(
      `Node did not become healthy after ${retries} attempts (~${waited}s, ` +
        `--health-retries/--health-delay to adjust). Recent container logs:`,
    );
    const { stdout, stderr } = await run("docker", ["logs", "--tail", "30", CONTAINER_NAME], {
      silent: true,
      allowFailure: true,
    });
    console.error((stdout + stderr).trim() || `  (no logs -- check 'docker logs ${CONTAINER_NAME}' directly)`);
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
  await warnIfSandboxDirNotGitignored();
}

export function buildRunArgs(port) {
  return [
    "run", "-d", "--rm",
    "--name", CONTAINER_NAME,
    "-p", `${port}:8000`,
    IMAGE,
    "--standalone",
    "--enable-soroban-rpc",
  ];
}

/** Parses a CLI option into a positive integer, or logs an error and returns undefined. */
export function parsePositiveInt(value, defaultValue, flagName) {
  if (value === undefined) return defaultValue;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    console.error(`${flagName} must be a positive integer, got "${value}".`);
    return undefined;
  }
  return n;
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
