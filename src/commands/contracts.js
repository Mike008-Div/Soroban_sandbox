import { readJson, STATE_FILE, CONTRACTS_FILE } from "../lib/state.js";
import { run } from "../lib/shell.js";
import { createLogger } from "../lib/logger.js";

/** Queries the RPC endpoint for a deployed contract's wasm hash and interface. Never throws. */
export async function inspectOnChain(contractId, state) {
  const rpcArgs = ["--rpc-url", state.rpcUrl, "--network-passphrase", state.networkPassphrase];
  const info = {};

  try {
    const { stdout } = await run("soroban", ["contract", "info", "hash", "--contract-id", contractId, ...rpcArgs], {
      silent: true,
    });
    info.wasmHash = stdout.trim();
  } catch (err) {
    info.error = err.message;
    return info;
  }

  try {
    const { stdout } = await run(
      "soroban",
      ["contract", "info", "interface", "--contract-id", contractId, ...rpcArgs],
      { silent: true },
    );
    info.interface = stdout.trim();
  } catch {
    // Interface lookup is best-effort; the hash lookup already confirmed
    // the contract exists on chain.
  }

  return info;
}

export async function contractsCommand(name, options = {}) {
  const log = createLogger({ quiet: options.json });
  const contracts = await readJson(CONTRACTS_FILE, {});

  if (!name) {
    if (options.json) {
      console.log(JSON.stringify(contracts, null, 2));
      return;
    }
    const names = Object.keys(contracts);
    if (names.length === 0) {
      log.info("No contracts recorded. Run `sandbox deploy` first.");
      return;
    }
    log.info(`Contracts (${names.length}):`);
    for (const n of names) log.info(`  - ${n}: ${contracts[n].contractId}`);
    return;
  }

  const entry = contracts[name];
  if (!entry) {
    log.error(`No contract named "${name}" found. Run \`sandbox contracts\` to see recorded contracts.`);
    process.exitCode = 1;
    return;
  }

  const state = await readJson(STATE_FILE);
  const onChain = state?.running
    ? await inspectOnChain(entry.contractId, state)
    : { error: "No running sandbox -- showing the local record only." };

  const result = { name, ...entry, ...onChain };

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  log.info(`Contract "${name}"`);
  log.info(`  id:          ${result.contractId}`);
  log.info(`  wasm:        ${result.wasmPath}`);
  log.info(`  deployed by: ${result.deployedBy}`);
  log.info(`  deployed at: ${result.deployedAt}`);
  if (result.wasmHash) log.info(`  wasm hash:   ${result.wasmHash}`);
  if (result.error) log.info(`  on-chain:    ${result.error}`);
  if (result.interface) log.info(`\nInterface:\n${result.interface}`);
}
