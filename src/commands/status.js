import { readJson, STATE_FILE, ACCOUNTS_FILE, CONTRACTS_FILE } from "../lib/state.js";

export async function statusCommand() {
  const state = await readJson(STATE_FILE);

  if (!state?.running) {
    console.log("No sandbox is running. Run `sandbox init` to start one.");
    return;
  }

  const accounts = await readJson(ACCOUNTS_FILE, {});
  const contracts = await readJson(CONTRACTS_FILE, {});

  console.log(`Sandbox running (container: ${state.containerName})`);
  console.log(`  RPC:        ${state.rpcUrl}`);
  console.log(`  Passphrase: ${state.networkPassphrase}`);
  console.log(`  Started:    ${state.startedAt}`);

  const accountNames = Object.keys(accounts);
  console.log(`\nAccounts (${accountNames.length}):`);
  for (const name of accountNames) {
    console.log(`  - ${name}: ${accounts[name].publicKey}`);
  }

  const contractNames = Object.keys(contracts);
  console.log(`\nContracts (${contractNames.length}):`);
  for (const name of contractNames) {
    console.log(`  - ${name}: ${contracts[name].contractId}`);
  }
}
