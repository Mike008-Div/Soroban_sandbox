import path from "path";
import { run } from "../lib/shell.js";
import { readJson, writeJson, STATE_FILE, ACCOUNTS_FILE, CONTRACTS_FILE } from "../lib/state.js";

export async function deployCommand(wasmPath, options = {}) {
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

  const { stdout } = await run(
    "soroban",
    [
      "contract", "deploy",
      "--wasm", path.resolve(wasmPath),
      "--source", deployer.secret,
      "--rpc-url", state.rpcUrl,
      "--network-passphrase", state.networkPassphrase,
    ],
    { silent: true }
  );

  const contractId = stdout.trim().split("\n").pop();

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
