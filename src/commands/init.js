import { run, commandExists } from "../lib/shell.js";
import { writeJson, readJson, STATE_FILE } from "../lib/state.js";
import { warnIfSandboxDirNotGitignored } from "../lib/gitignore.js";
import { createLogger } from "../lib/logger.js";

const CONTAINER_NAME = "soroban-sandbox-node";
const IMAGE = "stellar/quickstart:latest";
const RPC_PORT = 8000;

// Public networks need no local container -- just their public RPC and
// passphrase. Only "standalone" spins up the Docker quickstart image.
export const REMOTE_NETWORKS = {
  testnet: {
    rpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
  },
  futurenet: {
    rpcUrl: "https://rpc-futurenet.stellar.org",
    networkPassphrase: "Test SDF Future Network ; October 2022",
  },
};

export async function initCommand(options = {}) {
  const log = createLogger(options);
  const network = options.network || "standalone";
  if (network !== "standalone" && !REMOTE_NETWORKS[network]) {
    log.error(`Unknown --network "${network}". Expected one of: standalone, ${Object.keys(REMOTE_NETWORKS).join(", ")}.`);
    process.exitCode = 1;
    return;
  }

  const existing = await readJson(STATE_FILE, null, options.cwd);
  if (existing?.running) {
    log.info(
      `Sandbox already running (container: ${existing.containerName}). Run 'sandbox reset' first if you want a clean one.`
    );
    return;
  }

  const retries = parsePositiveInt(options.healthRetries, 30, "--health-retries");
  const delayMs = parsePositiveInt(options.healthDelay, 2000, "--health-delay");
  const port = parsePositiveInt(options.port, RPC_PORT, "--port");
  if (retries === undefined || delayMs === undefined || port === undefined) {
    process.exitCode = 1;
    return;
  }

  if (network !== "standalone") {
    await initRemote(network, { retries, delayMs, log, cwd: options.cwd });
    return;
  }

  const hasDocker = await commandExists("docker");
  if (!hasDocker) {
    log.error("Docker is required but was not found on PATH. Install Docker and try again.");
    process.exitCode = 1;
    return;
  }

  log.info(`Starting local Stellar/Soroban node (${IMAGE}) on port ${port}...`);

  await run("docker", buildRunArgs(port), { silent: options.quiet });

  const rpcUrl = `http://localhost:${port}/soroban/rpc`;
  const networkPassphrase = "Standalone Network ; February 2017";
  const healthy = await waitForHealthy(rpcUrl, { retries, delayMs });

  if (!healthy) {
    const waited = ((retries * delayMs) / 1000).toFixed(0);
    log.error(
      `Node did not become healthy after ${retries} attempts (~${waited}s, ` +
        `--health-retries/--health-delay to adjust). Recent container logs:`,
    );
    const { stdout, stderr } = await run("docker", ["logs", "--tail", "30", CONTAINER_NAME], {
      silent: true,
      allowFailure: true,
    });
    log.error((stdout + stderr).trim() || `  (no logs -- check 'docker logs ${CONTAINER_NAME}' directly)`);
    process.exitCode = 1;
    return;
  }

  await writeJson(
    STATE_FILE,
    {
      running: true,
      network,
      containerName: CONTAINER_NAME,
      rpcUrl,
      networkPassphrase,
      startedAt: new Date().toISOString(),
    },
    options.cwd,
  );

  log.info(`Sandbox is ready.\n  RPC: ${rpcUrl}\n  Network passphrase: ${networkPassphrase}`);
  // Not gated by --quiet: this is a security-relevant warning, not noise.
  await warnIfSandboxDirNotGitignored(options.cwd);
}

async function initRemote(network, { retries, delayMs, log, cwd }) {
  const { rpcUrl, networkPassphrase } = REMOTE_NETWORKS[network];
  log.info(`Connecting to ${network} (${rpcUrl})...`);

  const healthy = await waitForHealthy(rpcUrl, { retries, delayMs });
  if (!healthy) {
    const waited = ((retries * delayMs) / 1000).toFixed(0);
    log.error(`Could not reach ${network} after ${retries} attempts (~${waited}s). Check your network connection.`);
    process.exitCode = 1;
    return;
  }

  await writeJson(
    STATE_FILE,
    {
      running: true,
      network,
      containerName: null, // no local container to stop/tail for a remote network
      rpcUrl,
      networkPassphrase,
      startedAt: new Date().toISOString(),
    },
    cwd,
  );

  log.info(`Sandbox is up (${network}).\n  RPC: ${rpcUrl}\n  Network passphrase: ${networkPassphrase}`);
  await warnIfSandboxDirNotGitignored(cwd);
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
