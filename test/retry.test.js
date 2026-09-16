import test from "node:test";
import assert from "node:assert/strict";
import { withRetry } from "../src/lib/retry.js";

const noSleep = async () => {};

test("withRetry returns on first success without sleeping", async () => {
  let sleeps = 0;
  let calls = 0;
  await withRetry(
    async () => {
      calls++;
      return "ok";
    },
    { sleep: async () => sleeps++ },
  );
  assert.equal(calls, 1);
  assert.equal(sleeps, 0);
});

test("withRetry retries up to `retries` extra times, then succeeds", async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls++;
      if (calls < 3) throw new Error("transient");
      return "ok";
    },
    { retries: 5, sleep: noSleep },
  );
  assert.equal(result, "ok");
  assert.equal(calls, 3);
});

test("withRetry throws the last error once retries are exhausted", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls++;
          throw new Error("still failing");
        },
        { retries: 2, sleep: noSleep },
      ),
    /still failing/,
  );
  assert.equal(calls, 3); // first try + 2 retries
});

test("withRetry backs off exponentially", async () => {
  const delays = [];
  let calls = 0;
  await withRetry(
    async () => {
      calls++;
      if (calls < 4) throw new Error("transient");
      return "ok";
    },
    { retries: 5, delayMs: 100, factor: 2, sleep: async (ms) => delays.push(ms) },
  );
  assert.deepEqual(delays, [100, 200, 400]);
});
