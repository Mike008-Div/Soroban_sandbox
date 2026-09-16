import { promises as fs } from "fs";
import { run } from "./shell.js";
import { readJson, STATE_FILE, ACCOUNTS_FILE, CONTRACTS_FILE } from "./state.js";

/**
 * Checks every step's account/contract references against what's actually
 * seeded/deployed, without running anything. Returns every missing
 * reference at once (not just the first), labeled by which step and field
 * it came from, so a typo three steps in doesn't waste the first two
 * steps' real transactions before failing.
 */
export function validateScenarioReferences(steps, accounts, contracts) {
  const errors = [];

  function checkAccountRef(name, where) {
    if (name !== undefined && !accounts[name]) errors.push(`${where}: unknown account "${name}"`);
  }

  steps.forEach((step, i) => {
    const label = step.label || `step ${i + 1}`;
    if (step.contract !== undefined && !contracts[step.contract]) {
      errors.push(`${label}: unknown contract "${step.contract}"`);
    }
    checkAccountRef(step.as, label);
    for (const a of step.args || []) {
      if (a.value && typeof a.value === "object" && a.value.account) {
        checkAccountRef(a.value.account, `${label}, arg "${a.name}"`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Executes a scenario file's steps against the running sandbox.
 * Returns structured results instead of just printing, so both the
 * CLI command and the dashboard API can use it.
 */
export async function runScenario(scenarioPath) {
  const state = await readJson(STATE_FILE);
  if (!state?.running) {
    throw new Error("No running sandbox found. Run `sandbox init` first.");
  }

  const accounts = await readJson(ACCOUNTS_FILE, {});
  const contracts = await readJson(CONTRACTS_FILE, {});

  const scenario = JSON.parse(await fs.readFile(scenarioPath, "utf-8"));
  const steps = scenario.steps || [];

  const preflight = validateScenarioReferences(steps, accounts, contracts);
  if (!preflight.valid) {
    throw new Error(`Scenario references things that don't exist:\n  - ${preflight.errors.join("\n  - ")}`);
  }

  const results = [];

  function resolveArgument(value) {
    if (value && typeof value === "object" && value.account) {
      const account = accounts[value.account];
      if (!account) throw new Error(`unknown account "${value.account}"`);
      return account.publicKey;
    }
    return value;
  }

  for (const [i, step] of steps.entries()) {
    const label = step.label || `step ${i + 1}`;
    const contract = contracts[step.contract];
    const account = accounts[step.as];

    const args = [
      "contract", "invoke",
      "--id", contract.contractId,
      "--source", account.secret,
      "--rpc-url", state.rpcUrl,
      "--network-passphrase", state.networkPassphrase,
      "--", step.method,
      ...(step.args || []).flatMap((a) => [`--${a.name}`, String(resolveArgument(a.value))]),
    ];

    try {
      const { stdout } = await run("soroban", args, { silent: true });
      const actual = stdout.trim();
      if (step.expect !== undefined && actual !== String(step.expect)) {
        results.push({ label, ok: false, error: `expected "${step.expect}", got "${actual}"`, actual });
      } else {
        results.push({ label, ok: true, output: actual });
      }
    } catch (err) {
      results.push({ label, ok: false, error: err.message });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  return { results, passed, failed };
}
