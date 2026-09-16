import test from "node:test";
import assert from "node:assert/strict";
import { parsePositiveInt, buildRunArgs } from "../src/commands/init.js";

test("parsePositiveInt returns the default when the value is undefined", () => {
  assert.equal(parsePositiveInt(undefined, 30, "--health-retries"), 30);
});

test("parsePositiveInt parses a valid numeric string", () => {
  assert.equal(parsePositiveInt("45", 30, "--health-retries"), 45);
});

test("parsePositiveInt rejects zero, negative, and non-integer values", () => {
  assert.equal(parsePositiveInt("0", 30, "--health-retries"), undefined);
  assert.equal(parsePositiveInt("-5", 30, "--health-retries"), undefined);
  assert.equal(parsePositiveInt("3.5", 30, "--health-retries"), undefined);
  assert.equal(parsePositiveInt("nope", 30, "--health-retries"), undefined);
});

test("buildRunArgs maps the given port to the container's 8000", () => {
  const args = buildRunArgs(9000);
  assert.ok(args.includes("-p"));
  assert.equal(args[args.indexOf("-p") + 1], "9000:8000");
});

test("buildRunArgs uses the default port when called with 8000", () => {
  const args = buildRunArgs(8000);
  assert.equal(args[args.indexOf("-p") + 1], "8000:8000");
});
