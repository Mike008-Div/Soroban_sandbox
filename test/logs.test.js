import test from "node:test";
import assert from "node:assert/strict";
import { buildLogsArgs } from "../src/commands/logs.js";

test("buildLogsArgs follows by default", () => {
  assert.deepEqual(buildLogsArgs("my-container"), ["logs", "-f", "my-container"]);
});

test("buildLogsArgs omits -f when follow is false", () => {
  assert.deepEqual(buildLogsArgs("my-container", { follow: false }), ["logs", "my-container"]);
});

test("buildLogsArgs adds --tail when given", () => {
  assert.deepEqual(buildLogsArgs("my-container", { tail: 50 }), ["logs", "-f", "--tail", "50", "my-container"]);
});

test("buildLogsArgs combines --no-follow and --tail", () => {
  assert.deepEqual(buildLogsArgs("my-container", { follow: false, tail: 10 }), [
    "logs",
    "--tail",
    "10",
    "my-container",
  ]);
});
