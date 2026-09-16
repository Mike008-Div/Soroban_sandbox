#!/usr/bin/env node
/**
 * Full lifecycle integration test: init -> seed -> deploy -> run -> reset,
 * against a real local Docker node. Not part of `npm test` (too slow for
 * every run) -- run explicitly with `npm run test:integration`, or see it
 * invoked in CI (.github/workflows/ci.yml). Doubles as living
 * documentation of the whole workflow end to end.
 *
 * Requires Docker, the Rust wasm32-unknown-unknown target, and the
 * soroban/stellar CLI on PATH.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(REPO_ROOT, "src", "index.js");
const WASM_PATH = path.join(
  REPO_ROOT,
  "examples/contracts/token/target/wasm32-unknown-unknown/release/sandbox_token.wasm",
);

function sandbox(cwd, args) {
  const result = spawnSync("node", [CLI, ...args], { cwd, encoding: "utf-8" });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

test("full lifecycle: init -> seed -> deploy -> run -> reset", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "soroban-sandbox-integration-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));

  await t.test("contract is built", async () => {
    const hasWasm = await fs
      .access(WASM_PATH)
      .then(() => true)
      .catch(() => false);
    if (!hasWasm) {
      const build = spawnSync("npm", ["run", "contract:build"], { cwd: REPO_ROOT, encoding: "utf-8" });
      assert.equal(build.status, 0, `contract:build failed:\n${build.stdout}\n${build.stderr}`);
    }
  });

  await t.test("init starts a healthy local node", () => {
    const result = sandbox(dir, ["init"]);
    assert.equal(result.code, 0, `init failed:\n${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /Sandbox is up/);
  });

  await t.test("seed creates and funds alice and bob", async () => {
    await fs.writeFile(
      path.join(dir, "sandbox.config.json"),
      JSON.stringify({ accounts: [{ name: "alice", startingBalance: 10000 }, { name: "bob" }] }),
    );
    const result = sandbox(dir, ["seed", "--config", "sandbox.config.json"]);
    assert.equal(result.code, 0, `seed failed:\n${result.stdout}\n${result.stderr}`);

    const accounts = JSON.parse(await fs.readFile(path.join(dir, ".sandbox", "accounts.json"), "utf-8"));
    assert.ok(accounts.alice.publicKey);
    assert.ok(accounts.bob.publicKey);
  });

  await t.test("deploy records a real contract id", async () => {
    const result = sandbox(dir, ["deploy", WASM_PATH, "--as", "alice", "--name", "token"]);
    assert.equal(result.code, 0, `deploy failed:\n${result.stdout}\n${result.stderr}`);

    const contracts = JSON.parse(await fs.readFile(path.join(dir, ".sandbox", "contracts.json"), "utf-8"));
    assert.match(contracts.token.contractId, /^C[A-Z2-7]{55}$/);
  });

  await t.test("run executes the token scenario with every step passing", async () => {
    await fs.copyFile(path.join(REPO_ROOT, "examples", "token.scenario.json"), path.join(dir, "token.scenario.json"));
    const result = sandbox(dir, ["run", "token.scenario.json"]);
    assert.equal(result.code, 0, `run failed:\n${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /3 passed, 0 failed/);
    assert.ok(!result.stdout.includes("[FAIL]"), `unexpected failure in run output:\n${result.stdout}`);
  });

  await t.test("reset stops the container and clears state", async () => {
    const result = sandbox(dir, ["reset"]);
    assert.equal(result.code, 0, `reset failed:\n${result.stdout}\n${result.stderr}`);

    const sandboxDirExists = await fs
      .access(path.join(dir, ".sandbox"))
      .then(() => true)
      .catch(() => false);
    assert.equal(sandboxDirExists, false, ".sandbox/ should be gone after reset");

    const status = sandbox(dir, ["status"]);
    assert.match(status.stdout, /No sandbox is running/);
  });
});
