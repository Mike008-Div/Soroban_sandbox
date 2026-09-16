import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { readJson, writeJson, clearState, sandboxDirExists, STATE_FILE, ACCOUNTS_FILE } from "../src/lib/state.js";

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "soroban-state-test-"));
}

test("readJson returns the fallback when the file doesn't exist", async () => {
  const dir = tmpDir();
  try {
    assert.equal(await readJson(STATE_FILE, null, dir), null);
    assert.deepEqual(await readJson(ACCOUNTS_FILE, {}, dir), {});
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("writeJson then readJson round-trips the same data", async () => {
  const dir = tmpDir();
  try {
    await writeJson(STATE_FILE, { running: true, containerName: "c" }, dir);
    const state = await readJson(STATE_FILE, null, dir);
    assert.deepEqual(state, { running: true, containerName: "c" });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("writeJson creates .sandbox/ on demand", async () => {
  const dir = tmpDir();
  try {
    assert.equal(fs.existsSync(path.join(dir, ".sandbox")), false);
    await writeJson(STATE_FILE, { a: 1 }, dir);
    assert.equal(fs.existsSync(path.join(dir, ".sandbox")), true);
    assert.equal(fs.existsSync(path.join(dir, ".sandbox", STATE_FILE)), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("readJson propagates a real read error other than 'file missing'", async () => {
  const dir = tmpDir();
  try {
    // A directory where a file is expected triggers EISDIR, not ENOENT.
    fs.mkdirSync(path.join(dir, ".sandbox"), { recursive: true });
    fs.mkdirSync(path.join(dir, ".sandbox", STATE_FILE));
    await assert.rejects(() => readJson(STATE_FILE, null, dir));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("clearState removes .sandbox/ entirely", async () => {
  const dir = tmpDir();
  try {
    await writeJson(STATE_FILE, { a: 1 }, dir);
    await writeJson(ACCOUNTS_FILE, { alice: {} }, dir);
    assert.equal(await sandboxDirExists(dir), true);

    await clearState(dir);

    assert.equal(await sandboxDirExists(dir), false);
    assert.equal(fs.existsSync(path.join(dir, ".sandbox")), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("clearState on a cwd with no .sandbox/ does not throw", async () => {
  const dir = tmpDir();
  try {
    await assert.doesNotReject(() => clearState(dir));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("sandboxDirExists distinguishes present from absent", async () => {
  const dir = tmpDir();
  try {
    assert.equal(await sandboxDirExists(dir), false);
    await writeJson(STATE_FILE, {}, dir);
    assert.equal(await sandboxDirExists(dir), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
