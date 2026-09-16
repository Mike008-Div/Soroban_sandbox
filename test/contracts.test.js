import test from "node:test";
import assert from "node:assert/strict";
import { inspectOnChain } from "../src/commands/contracts.js";

test("inspectOnChain returns an error field, not a throw, when the RPC call fails", async () => {
  // Points at a closed port, so the underlying `soroban` invocation fails fast.
  const state = { rpcUrl: "http://localhost:1/soroban/rpc", networkPassphrase: "Test" };
  const info = await inspectOnChain("CFAKE", state);
  assert.ok(info.error, "expected an error field describing the failed lookup");
  assert.equal(info.wasmHash, undefined);
});
