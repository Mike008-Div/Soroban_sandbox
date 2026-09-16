import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parsePositiveInt, buildRunArgs, REMOTE_NETWORKS, initCommand } from "../src/commands/init.js";

test("parsePositiveInt returns the default when the value is undefined", () => {
  assert.equal(parsePositiveInt(undefined, 30, "--health-retries"), 30);
});

test("parsePositiveInt parses a valid numeric string", () => {
  assert.equal(parsePositiveInt("45", 30, "--health-retries"), 45);
});

test("parsePositiveInt rejects zero, negative, and non-integer values", () => {
  assert.equal(parsePositiveInt("0", 30, "--health-retries"), undefined);
  assert.equal(parsePositiveInt("-5", 30, "--health-retries"), undefined);
  assert.equal(parsePositiveInt("3.5", 30, "--health-retries"), undefined);
  assert.equal(parsePositiveInt("nope", 30, "--health-retries"), undefined);
});

test("buildRunArgs maps the given port to the container's 8000", () => {
  const args = buildRunArgs(9000);
  assert.ok(args.includes("-p"));
  assert.equal(args[args.indexOf("-p") + 1], "9000:8000");
});

test("buildRunArgs uses the default port when called with 8000", () => {
  const args = buildRunArgs(8000);
  assert.equal(args[args.indexOf("-p") + 1], "8000:8000");
});

test("REMOTE_NETWORKS has the expected public RPC/passphrase for testnet and futurenet", () => {
  assert.equal(REMOTE_NETWORKS.testnet.rpcUrl, "https://soroban-testnet.stellar.org");
  assert.equal(REMOTE_NETWORKS.testnet.networkPassphrase, "Test SDF Network ; September 2015");
  assert.equal(REMOTE_NETWORKS.futurenet.rpcUrl, "https://rpc-futurenet.stellar.org");
  assert.equal(REMOTE_NETWORKS.futurenet.networkPassphrase, "Test SDF Future Network ; October 2022");
});

test("initCommand rejects an unknown --network value without touching any state", async () => {
  const errors = [];
  const original = console.error;
  console.error = (msg) => errors.push(msg);
  try {
    await initCommand({ network: "mainnet" });
  } finally {
    console.error = original;
    process.exitCode = 0;
  }
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Unknown --network "mainnet"/);
  assert.match(errors[0], /standalone, testnet, futurenet/);
});

test("initCommand does nothing (no error, no write) when a sandbox is already running", async () => {
  // Passes cwd explicitly rather than process.chdir(), which mutates
  // process-global state that other test files running concurrently also
  // depend on (see reset.test.js for the intermittent failures that caused).
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "soroban-init-test-"));
  try {
    fs.mkdirSync(path.join(dir, ".sandbox"));
    fs.writeFileSync(
      path.join(dir, ".sandbox", "state.json"),
      JSON.stringify({ running: true, containerName: "x" }),
    );

    const logs = [];
    const original = console.log;
    console.log = (msg) => logs.push(msg);
    try {
      await initCommand({ network: "standalone", cwd: dir });
    } finally {
      console.log = original;
    }
    assert.ok(logs.some((l) => l.includes("already running")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
