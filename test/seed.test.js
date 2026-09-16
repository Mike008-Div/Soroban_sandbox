import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fundAccount, seedCommand } from "../src/commands/seed.js";
import { withRetry } from "../src/lib/retry.js";

function withMockedFetch(impl, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

test("fundAccount resolves when friendbot responds ok", async () => {
  await withMockedFetch(
    async () => ({ ok: true, status: 200 }),
    () => fundAccount("http://localhost:8000/friendbot", "GABC"),
  );
});

test("fundAccount throws with the status code when friendbot responds non-ok", async () => {
  await assert.rejects(
    () => withMockedFetch(async () => ({ ok: false, status: 503 }), () => fundAccount("http://x/friendbot", "GABC")),
    /503/,
  );
});

test("seed's retry wiring (withRetry + fundAccount) recovers from transient friendbot failures", async () => {
  let calls = 0;
  await withMockedFetch(
    async () => {
      calls++;
      if (calls < 3) return { ok: false, status: 503 };
      return { ok: true, status: 200 };
    },
    () => withRetry(() => fundAccount("http://x/friendbot", "GABC"), { retries: 5, delayMs: 1 }),
  );
  assert.equal(calls, 3);
});

test("seed's retry wiring gives up and throws once retries are exhausted", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withMockedFetch(
        async () => {
          calls++;
          return { ok: false, status: 500 };
        },
        () => withRetry(() => fundAccount("http://x/friendbot", "GABC"), { retries: 2, delayMs: 1 }),
      ),
    /500/,
  );
  assert.equal(calls, 3); // first try + 2 retries
});

function setupSandbox(dir) {
  fs.mkdirSync(path.join(dir, ".sandbox"));
  fs.writeFileSync(
    path.join(dir, ".sandbox", "state.json"),
    JSON.stringify({ running: true, rpcUrl: "http://localhost:8000/soroban/rpc" }),
  );
}

test("seedCommand end to end: writes accounts.json with the seeded keys", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "soroban-seed-e2e-"));
  try {
    setupSandbox(dir);
    const configPath = path.join(dir, "sandbox.config.json");
    fs.writeFileSync(configPath, JSON.stringify({ accounts: [{ name: "alice" }, { name: "bob", startingBalance: 5000 }] }));

    await withMockedFetch(async () => ({ ok: true, status: 200 }), () =>
      seedCommand({ config: configPath, cwd: dir }),
    );

    const accounts = JSON.parse(fs.readFileSync(path.join(dir, ".sandbox", "accounts.json"), "utf-8"));
    assert.ok(accounts.alice.publicKey);
    assert.ok(accounts.alice.secret);
    assert.equal(accounts.alice.startingBalance, 10000);
    assert.equal(accounts.bob.startingBalance, 5000);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("seedCommand fails cleanly on an invalid config, writing nothing", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "soroban-seed-e2e-"));
  try {
    setupSandbox(dir);
    const configPath = path.join(dir, "sandbox.config.json");
    fs.writeFileSync(configPath, JSON.stringify({ accounts: [{ startingBalance: 100 }] })); // missing "name"

    await seedCommand({ config: configPath, cwd: dir });

    assert.equal(fs.existsSync(path.join(dir, ".sandbox", "accounts.json")), false);
    assert.equal(process.exitCode, 1);
  } finally {
    process.exitCode = 0;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("seedCommand fails cleanly when no sandbox is running", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "soroban-seed-e2e-"));
  try {
    const configPath = path.join(dir, "sandbox.config.json");
    fs.writeFileSync(configPath, JSON.stringify({ accounts: [{ name: "alice" }] }));

    await seedCommand({ config: configPath, cwd: dir });

    assert.equal(process.exitCode, 1);
  } finally {
    process.exitCode = 0;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
