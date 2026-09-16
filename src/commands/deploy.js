import fs from "fs";
import path from "path";
import { run } from "../lib/shell.js";
import { readJson, writeJson, STATE_FILE, ACCOUNTS_FILE, CONTRACTS_FILE } from "../lib/state.js";

export function validateWasmPath(wasmPath) {
  if (!wasmPath || typeof wasmPath !== "string") {
    return { valid: false, error: "A path to a .wasm file is required." };
  }

  if (path.extname(wasmPath).toLowerCase() !== ".wasm") {
    return {
      valid: false,
      error: `Invalid file extension for "${wasmPath}". Expected a .wasm file.`,
    };
  }

  const resolved = path.resolve(wasmPath);
  if (!fs.existsSync(resolved)) {
    return {
      valid: false,
      error: `WASM file does not exist at "${wasmPath}".`,
    };
  }

  const stat = fs.statSync(resolved);
  if (!stat.isFile()) {
    return {
      valid: false,
      error: `Specified path "${wasmPath}" is not a file.`,
    };
  }

  return { valid: true, resolvedPath: resolved };
}

// Stellar StrKey contract address: "C" + 55 base32 characters.
const CONTRACT_ID_PATTERN = /^C[A-Z2-7]{55}$/;

/** Pulls the contract id out of `soroban contract deploy`'s stdout, or returns null if it doesn't look like one. */
export function extractContractId(stdout) {
  const lastLine = stdout.trim().split("\n").pop() || "";
  return CONTRACT_ID_PATTERN.test(lastLine) ? lastLine : null;
}

export async function deployCommand(wasmPath, options = {}) {
  const validation = validateWasmPath(wasmPath);
  if (!validation.valid) {
    console.error(validation.error);
    process.exitCode = 1;
    return;
  }

  const state = await readJson(STATE_FILE);
  if (!state?.running) {
    console.error("No running sandbox found. Run `sandbox init` first.");
    process.exitCode = 1;
    return;
  }

  const accounts = await readJson(ACCOUNTS_FILE, {});
  const deployerName = options.as || Object.keys(accounts)[0];
  const deployer = accounts[deployerName];

  if (!deployer) {
    console.error(`No account named "${deployerName}" found. Run \`sandbox seed\` first, or pass --as <name>.`);
    process.exitCode = 1;
    return;
  }

  console.log(`Deploying ${wasmPath} as ${deployerName}...`);

  let stdout;
  try {
    ({ stdout } = await run(
      "soroban",
      [
        "contract", "deploy",
        "--wasm", path.resolve(wasmPath),
        "--source", deployer.secret,
        "--rpc-url", state.rpcUrl,
        "--network-passphrase", state.networkPassphrase,
      ],
      { silent: true }
    ));
  } catch (err) {
    // Nothing written to contracts.json -- state is unchanged.
    console.error(`Deploy failed:\n${err.message}`);
    process.exitCode = 1;
    return;
  }

  const contractId = extractContractId(stdout);
  if (!contractId) {
    // The CLI exited 0 but didn't print something that looks like a
    // contract id -- don't guess, and don't record a bad entry.
    console.error(`Deploy did not produce a recognizable contract id. Raw output:\n${stdout.trim()}`);
    process.exitCode = 1;
    return;
  }

  const contracts = await readJson(CONTRACTS_FILE, {});
  const name = options.name || path.basename(wasmPath, ".wasm");
  contracts[name] = {
    contractId,
    wasmPath,
    deployedBy: deployerName,
    deployedAt: new Date().toISOString(),
  };
  await writeJson(CONTRACTS_FILE, contracts);

  console.log(`Deployed. Contract "${name}" -> ${contractId}`);
}
