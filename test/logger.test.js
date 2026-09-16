import test from "node:test";
import assert from "node:assert/strict";
import { createLogger } from "../src/lib/logger.js";

function capture(fn) {
  const calls = { log: [], warn: [], error: [] };
  const originals = { log: console.log, warn: console.warn, error: console.error };
  console.log = (...a) => calls.log.push(a);
  console.warn = (...a) => calls.warn.push(a);
  console.error = (...a) => calls.error.push(a);
  try {
    fn();
  } finally {
    Object.assign(console, originals);
  }
  return calls;
}

test("default logger (not quiet) prints info, warn, and error", () => {
  const calls = capture(() => {
    const log = createLogger();
    log.info("hello");
    log.warn("careful");
    log.error("oops");
  });
  assert.equal(calls.log.length, 1);
  assert.equal(calls.warn.length, 1);
  assert.equal(calls.error.length, 1);
});

test("quiet logger suppresses info and warn but not error", () => {
  const calls = capture(() => {
    const log = createLogger({ quiet: true });
    log.info("hello");
    log.warn("careful");
    log.error("oops");
  });
  assert.equal(calls.log.length, 0);
  assert.equal(calls.warn.length, 0);
  assert.equal(calls.error.length, 1);
});
