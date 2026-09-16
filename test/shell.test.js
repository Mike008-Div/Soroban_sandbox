import test from "node:test";
import assert from "node:assert/strict";
import { redactArgs, redactText, run } from "../src/lib/shell.js";

const FAKE_SECRET = "S" + "A".repeat(55);

test("redactArgs redacts a bare secret key wherever it appears", () => {
  assert.deepEqual(redactArgs(["contract", "invoke", "--id", "C123", FAKE_SECRET]), [
    "contract",
    "invoke",
    "--id",
    "C123",
    "[REDACTED]",
  ]);
});

test("redactArgs redacts the value following known secret-bearing flags", () => {
  assert.deepEqual(redactArgs(["--source", FAKE_SECRET, "--rpc-url", "http://x"]), [
    "--source",
    "[REDACTED]",
    "--rpc-url",
    "http://x",
  ]);
});

test("redactArgs leaves unrelated args untouched", () => {
  const args = ["contract", "deploy", "--wasm", "/tmp/x.wasm", "--rpc-url", "http://localhost:8000"];
  assert.deepEqual(redactArgs(args), args);
});

test("redactText redacts a secret key embedded in free-form text", () => {
  assert.equal(redactText(`error: account ${FAKE_SECRET} not found`), "error: account [REDACTED] not found");
});

test("redactText leaves text with no secret unchanged", () => {
  assert.equal(redactText("error: some other problem"), "error: some other problem");
});

test("run() never leaks a secret-bearing arg in its rejection message", async () => {
  await assert.rejects(
    () => run("node", ["-e", "process.exit(1)", "--source", FAKE_SECRET]),
    (err) => {
      assert.ok(!err.message.includes(FAKE_SECRET), `error message leaked the secret: ${err.message}`);
      assert.ok(err.message.includes("[REDACTED]"));
      return true;
    },
  );
});
