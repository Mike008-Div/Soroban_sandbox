import test from "node:test";
import assert from "node:assert/strict";
import { fundAccount } from "../src/commands/seed.js";
import { withRetry } from "../src/lib/retry.js";

// Tests fundAccount + withRetry directly (how seedCommand wires them)
// rather than exercising seedCommand end to end, which would need
// process.chdir() into a fake project -- chdir mutates process-global
// state that other test files running concurrently also depend on, and
// that caused real intermittent failures elsewhere in this suite.

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
