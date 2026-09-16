import { readJson, STATE_FILE, ACCOUNTS_FILE, CONTRACTS_FILE } from "../lib/state.js";

/** Gathers the same data statusCommand prints, as a plain object -- used by both the human and --json output. */
export async function getStatus(cwd = process.cwd()) {
  const state = await readJson(STATE_FILE, null, cwd);
  if (!state?.running) return { running: false };

  const accounts = await readJson(ACCOUNTS_FILE, {}, cwd);
  const contracts = await readJson(CONTRACTS_FILE, {}, cwd);
  // Never include secret keys in status output.
  const safeAccounts = Object.fromEntries(
    Object.entries(accounts).map(([name, a]) => [name, { publicKey: a.publicKey, startingBalance: a.startingBalance }]),
  );

  return {
    running: true,
    network: state.network || "standalone",
    containerName: state.containerName,
    rpcUrl: state.rpcUrl,
    networkPassphrase: state.networkPassphrase,
    startedAt: state.startedAt,
    accounts: safeAccounts,
    contracts,
  };
}

export async function statusCommand(options = {}) {
  const status = await getStatus();

  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  if (!status.running) {
    console.log("No sandbox is running. Run `sandbox init` to start one.");
    return;
  }

  console.log(
    `Sandbox running (network: ${status.network}${status.containerName ? `, container: ${status.containerName}` : ""})`,
  );
  console.log(`  RPC:        ${status.rpcUrl}`);
  console.log(`  Passphrase: ${status.networkPassphrase}`);
  console.log(`  Started:    ${status.startedAt}`);

  const accountNames = Object.keys(status.accounts);
  console.log(`\nAccounts (${accountNames.length}):`);
  for (const name of accountNames) {
    console.log(`  - ${name}: ${status.accounts[name].publicKey}`);
  }

  const contractNames = Object.keys(status.contracts);
  console.log(`\nContracts (${contractNames.length}):`);
  for (const name of contractNames) {
    console.log(`  - ${name}: ${status.contracts[name].contractId}`);
  }
}
