import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { deployCommand } from "../src/commands/deploy.js";

const VALID_CONTRACT_ID = "C" + "A".repeat(55);

/** Writes a fake `soroban` shell script that always prints `output` and exits `exitCode`, and returns its directory. */
function fakeSoroban({ output = "", exitCode = 0 } = {}) {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "soroban-fakebin-"));
  const script = path.join(binDir, "soroban");
  fs.writeFileSync(script, `#!/bin/sh\necho "${output}"\nexit ${exitCode}\n`, { mode: 0o755 });
  return binDir;
}

/** Runs `fn` with a fake `soroban` prepended to PATH, restoring PATH afterward. */
async function withFakeSoroban(fakeBinOpts, fn) {
  const binDir = fakeSoroban(fakeBinOpts);
  const originalPath = process.env.PATH;
  process.env.PATH = `${binDir}${path.delimiter}${originalPath}`;
  try {
    await fn();
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(binDir, { recursive: true, force: true });
  }
}

function setupSandbox(dir) {
  fs.mkdirSync(path.join(dir, ".sandbox"));
  fs.writeFileSync(
    path.join(dir, ".sandbox", "state.json"),
    JSON.stringify({ running: true, rpcUrl: "http://localhost:8000/soroban/rpc", networkPassphrase: "Test" }),
  );
  fs.writeFileSync(
    path.join(dir, ".sandbox", "accounts.json"),
    JSON.stringify({ alice: { publicKey: "GALICE", secret: "SALICESECRET" } }),
  );
}

function writeWasm(dir) {
  const wasmPath = path.join(dir, "contract.wasm");
  fs.writeFileSync(wasmPath, Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));
  return wasmPath;
}

test("deployCommand records the deployed contract on success", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "soroban-deploy-test-"));
  try {
    setupSandbox(dir);
    const wasmPath = writeWasm(dir);

    await withFakeSoroban({ output: VALID_CONTRACT_ID }, () =>
      deployCommand(wasmPath, { as: "alice", name: "token", cwd: dir }),
    );

    const contracts = JSON.parse(fs.readFileSync(path.join(dir, ".sandbox", "contracts.json"), "utf-8"));
    assert.equal(contracts.token.contractId, VALID_CONTRACT_ID);
    assert.equal(contracts.token.deployedBy, "alice");
    assert.equal(process.exitCode, undefined);
  } finally {
    process.exitCode = 0;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("deployCommand does not write contracts.json when the CLI call fails", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "soroban-deploy-test-"));
  try {
    setupSandbox(dir);
    const wasmPath = writeWasm(dir);

    await withFakeSoroban({ output: "some error", exitCode: 1 }, () =>
      deployCommand(wasmPath, { as: "alice", name: "token", cwd: dir }),
    );

    assert.equal(fs.existsSync(path.join(dir, ".sandbox", "contracts.json")), false);
    assert.equal(process.exitCode, 1);
  } finally {
    process.exitCode = 0;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("deployCommand --json prints a structured success result and nothing else", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "soroban-deploy-test-"));
  const logs = [];
  const original = console.log;
  console.log = (msg) => logs.push(msg);
  try {
    setupSandbox(dir);
    const wasmPath = writeWasm(dir);

    await withFakeSoroban({ output: VALID_CONTRACT_ID }, () =>
      deployCommand(wasmPath, { as: "alice", name: "token", cwd: dir, json: true }),
    );

    assert.equal(logs.length, 1);
    const result = JSON.parse(logs[0]);
    assert.equal(result.success, true);
    assert.equal(result.contractId, VALID_CONTRACT_ID);
  } finally {
    console.log = original;
    process.exitCode = 0;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("deployCommand fails cleanly when no sandbox is running", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "soroban-deploy-test-"));
  try {
    const wasmPath = writeWasm(dir);
    await deployCommand(wasmPath, { cwd: dir });
    assert.equal(process.exitCode, 1);
  } finally {
    process.exitCode = 0;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
