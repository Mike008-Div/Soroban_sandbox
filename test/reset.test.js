import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { resetCommand } from "../src/commands/reset.js";

// Uses an explicit cwd rather than process.chdir(), since chdir mutates
// process-global state that other test files running concurrently also
// depend on (this caused real, intermittent cross-file failures).

test("reset --dry-run does not remove .sandbox", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "soroban-reset-test-"));
  try {
    fs.mkdirSync(path.join(dir, ".sandbox"));
    fs.writeFileSync(path.join(dir, ".sandbox", "state.json"), "{}");

    await resetCommand({ dryRun: true, cwd: dir });

    assert.equal(fs.existsSync(path.join(dir, ".sandbox")), true, "dry-run must not remove .sandbox");
    assert.equal(fs.existsSync(path.join(dir, ".sandbox", "state.json")), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("reset --dry-run reports correctly when there is no .sandbox yet", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "soroban-reset-test-"));
  try {
    // Should not throw even with nothing to report on.
    await resetCommand({ dryRun: true, cwd: dir });
    assert.equal(fs.existsSync(path.join(dir, ".sandbox")), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
