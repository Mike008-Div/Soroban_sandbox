import { Keypair } from "@stellar/stellar-sdk";
import { promises as fs } from "fs";
import { readJson, writeJson, STATE_FILE, ACCOUNTS_FILE } from "../lib/state.js";
import { warnIfSandboxDirNotGitignored } from "../lib/gitignore.js";
import { withRetry } from "../lib/retry.js";
import { parsePositiveInt } from "./init.js";

export async function fundAccount(friendbotUrl, publicKey) {
  const res = await fetch(`${friendbotUrl}?addr=${encodeURIComponent(publicKey)}`);
  if (!res.ok) {
    throw new Error(`friendbot returned status ${res.status}`);
  }
}

export async function seedCommand(options) {
  const state = await readJson(STATE_FILE);
  if (!state?.running) {
    console.error("No running sandbox found. Run `sandbox init` first.");
    process.exitCode = 1;
    return;
  }

  let config;
  try {
    const raw = await fs.readFile(options.config, "utf-8");
    config = JSON.parse(raw);
  } catch (err) {
    console.error(`Could not read config at ${options.config}: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  const accounts = config.accounts || [];
  if (accounts.length === 0) {
    console.error(`No accounts defined in ${options.config}. Expected: { "accounts": [{ "name": "alice" }] }`);
    process.exitCode = 1;
    return;
  }

  const retries = parsePositiveInt(options.retries, 3, "--retries");
  if (retries === undefined) {
    process.exitCode = 1;
    return;
  }

  const friendbotUrl = state.rpcUrl.replace(/\/soroban\/rpc$/, "/friendbot");
  const results = {};

  for (const acct of accounts) {
    const keypair = Keypair.random();
    console.log(`Funding ${acct.name} (${keypair.publicKey()})...`);

    try {
      await withRetry(() => fundAccount(friendbotUrl, keypair.publicKey()), { retries });
    } catch (err) {
      console.warn(`  Warning: friendbot funding failed for ${acct.name} after ${retries + 1} attempts: ${err.message}`);
    }

    results[acct.name] = {
      publicKey: keypair.publicKey(),
      secret: keypair.secret(),
      startingBalance: acct.startingBalance ?? 10000,
    };
  }

  await writeJson(ACCOUNTS_FILE, results);
  console.log(`Seeded ${accounts.length} account(s). Keys saved to .sandbox/${ACCOUNTS_FILE} (gitignored — never commit this).`);
  await warnIfSandboxDirNotGitignored();
}
