import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getStatus } from "../src/commands/status.js";

// Uses an explicit cwd rather than process.chdir(), since chdir mutates
// process-global state that other test files running concurrently also
// depend on (see reset.test.js for the intermittent failures that caused).

test("getStatus reports not running when there is no state file", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "soroban-status-test-"));
  try {
    assert.deepEqual(await getStatus(dir), { running: false });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("getStatus never includes account secret keys", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "soroban-status-test-"));
  try {
    fs.mkdirSync(path.join(dir, ".sandbox"));
    fs.writeFileSync(
      path.join(dir, ".sandbox", "state.json"),
      JSON.stringify({
        running: true,
        containerName: "c",
        rpcUrl: "http://localhost:8000/soroban/rpc",
        networkPassphrase: "Standalone Network ; February 2017",
        startedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    fs.writeFileSync(
      path.join(dir, ".sandbox", "accounts.json"),
      JSON.stringify({ alice: { publicKey: "GABC", secret: "SVERYSECRET", startingBalance: 10000 } }),
    );
    fs.writeFileSync(path.join(dir, ".sandbox", "contracts.json"), JSON.stringify({ token: { contractId: "CABC" } }));

    const status = await getStatus(dir);

    assert.equal(status.running, true);
    assert.equal(status.accounts.alice.publicKey, "GABC");
    assert.equal(status.accounts.alice.secret, undefined);
    assert.equal(status.contracts.token.contractId, "CABC");
    assert.equal(JSON.stringify(status).includes("SVERYSECRET"), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
