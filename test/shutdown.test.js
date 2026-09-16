import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { registerShutdownHandler, _resetForTests } from "../src/lib/shutdown.js";

// Uses a fake EventEmitter as the signal source rather than emitting a real
// SIGINT/SIGTERM at this process: Node's own test runner also listens for
// SIGINT to cancel the rest of the suite, so a real emit here would kill
// the remaining tests in this file.
function fakeProcess() {
  return new EventEmitter();
}

test.beforeEach(() => _resetForTests());
test.after(() => _resetForTests());

test("runs a single registered cleanup on SIGINT and exits with 130", async () => {
  const proc = fakeProcess();
  let cleaned = false;
  const exitCodes = [];
  registerShutdownHandler(
    async () => {
      cleaned = true;
    },
    { onExit: (code) => exitCodes.push(code), signalSource: proc },
  );

  proc.emit("SIGINT");
  await new Promise((r) => setImmediate(r));

  assert.equal(cleaned, true);
  assert.deepEqual(exitCodes, [130]);
});

test("runs every registered cleanup concurrently and waits for the slowest one", async () => {
  const proc = fakeProcess();
  const order = [];
  const exitCodes = [];
  // onExit is only bound from whichever registerShutdownHandler call
  // triggers installation first, so every call in a test must pass the
  // same fake -- otherwise the real process.exit() default wins.
  const onExit = (code) => exitCodes.push(code);
  registerShutdownHandler(
    async () => {
      await new Promise((r) => setTimeout(r, 20));
      order.push("slow");
    },
    { onExit, signalSource: proc },
  );
  registerShutdownHandler(
    async () => {
      order.push("fast");
    },
    { onExit, signalSource: proc },
  );

  proc.emit("SIGTERM");
  await new Promise((r) => setTimeout(r, 50));

  assert.deepEqual(order, ["fast", "slow"]);
  assert.deepEqual(exitCodes, [143]);
});

test("a second signal while shutting down exits immediately instead of re-running cleanup", async () => {
  const proc = fakeProcess();
  let cleanupRuns = 0;
  const exitCodes = [];
  registerShutdownHandler(
    async () => {
      cleanupRuns++;
      await new Promise((r) => setTimeout(r, 20));
    },
    { onExit: (code) => exitCodes.push(code), signalSource: proc },
  );

  proc.emit("SIGINT");
  proc.emit("SIGINT"); // fired while the first is still cleaning up
  await new Promise((r) => setTimeout(r, 40));

  assert.equal(cleanupRuns, 1);
  assert.deepEqual(exitCodes, [1, 130]);
});
