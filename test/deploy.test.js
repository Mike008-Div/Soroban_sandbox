import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { validateWasmPath } from "../src/commands/deploy.js";

test("validateWasmPath rejects missing or non-string input", () => {
  const r1 = validateWasmPath();
  assert.equal(r1.valid, false);
  assert.match(r1.error, /required/i);

  const r2 = validateWasmPath(null);
  assert.equal(r2.valid, false);

  const r3 = validateWasmPath(123);
  assert.equal(r3.valid, false);
});

test("validateWasmPath rejects non-.wasm files", () => {
  const r1 = validateWasmPath("contract.json");
  assert.equal(r1.valid, false);
  assert.match(r1.error, /Expected a .wasm file/i);

  const r2 = validateWasmPath("contract.rs");
  assert.equal(r2.valid, false);
  assert.match(r2.error, /Expected a .wasm file/i);
});

test("validateWasmPath rejects non-existent .wasm files", () => {
  const r = validateWasmPath("non_existent_contract.wasm");
  assert.equal(r.valid, false);
  assert.match(r.error, /does not exist/i);
});

test("validateWasmPath rejects directories named with .wasm extension", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "soroban-test-"));
  const dirAsWasm = path.join(tmpDir, "fake.wasm");
  fs.mkdirSync(dirAsWasm);

  try {
    const r = validateWasmPath(dirAsWasm);
    assert.equal(r.valid, false);
    assert.match(r.error, /not a file/i);
  } finally {
    fs.rmdirSync(dirAsWasm);
    fs.rmdirSync(tmpDir);
  }
});

test("validateWasmPath accepts existing valid .wasm files", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "soroban-test-"));
  const fileAsWasm = path.join(tmpDir, "contract.wasm");
  fs.writeFileSync(fileAsWasm, Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));

  try {
    const r = validateWasmPath(fileAsWasm);
    assert.equal(r.valid, true);
    assert.equal(r.resolvedPath, path.resolve(fileAsWasm));
  } finally {
    fs.unlinkSync(fileAsWasm);
    fs.rmdirSync(tmpDir);
  }
});
