import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { isSandboxDirGitignored } from "../src/lib/gitignore.js";

function withTmpDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "soroban-gitignore-test-"));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("isSandboxDirGitignored is false when there is no .gitignore", async () => {
  await withTmpDir(async (dir) => {
    assert.equal(await isSandboxDirGitignored(dir), false);
  });
});

test("isSandboxDirGitignored is false when .gitignore doesn't mention .sandbox", async () => {
  await withTmpDir(async (dir) => {
    fs.writeFileSync(path.join(dir, ".gitignore"), "node_modules/\ndist/\n");
    assert.equal(await isSandboxDirGitignored(dir), false);
  });
});

for (const line of [".sandbox", ".sandbox/", "/.sandbox", "/.sandbox/", ".sandbox/**", ".sandbox/*"]) {
  test(`isSandboxDirGitignored is true for gitignore entry "${line}"`, async () => {
    await withTmpDir(async (dir) => {
      fs.writeFileSync(path.join(dir, ".gitignore"), `node_modules/\n${line}\n`);
      assert.equal(await isSandboxDirGitignored(dir), true);
    });
  });
}

test("isSandboxDirGitignored ignores commented-out entries", async () => {
  await withTmpDir(async (dir) => {
    fs.writeFileSync(path.join(dir, ".gitignore"), "# .sandbox/\n");
    assert.equal(await isSandboxDirGitignored(dir), false);
  });
});
