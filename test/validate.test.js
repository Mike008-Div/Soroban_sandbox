import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateConfig, validateScenario } from "../src/lib/validate.js";

test("validateConfig accepts a well-formed config", () => {
  const result = validateConfig({ accounts: [{ name: "alice" }, { name: "bob", startingBalance: 5000 }] });
  assert.deepEqual(result, { valid: true, errors: [] });
});

test("validateConfig rejects a config with no accounts array", () => {
  const result = validateConfig({});
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test("validateConfig rejects an empty accounts array", () => {
  const result = validateConfig({ accounts: [] });
  assert.equal(result.valid, false);
});

test("validateConfig rejects an account with no name", () => {
  const result = validateConfig({ accounts: [{ startingBalance: 100 }] });
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /name/);
});

test("validateConfig rejects a non-positive startingBalance", () => {
  const result = validateConfig({ accounts: [{ name: "alice", startingBalance: 0 }] });
  assert.equal(result.valid, false);
});

test("validateConfig rejects unknown top-level fields", () => {
  const result = validateConfig({ accounts: [{ name: "alice" }], extra: true });
  assert.equal(result.valid, false);
});

test("validateScenario accepts a well-formed scenario", () => {
  const result = validateScenario({
    steps: [
      {
        label: "s1",
        contract: "token",
        as: "alice",
        method: "transfer",
        args: [
          { name: "to", value: { account: "bob" } },
          { name: "amount", value: 100 },
        ],
        expect: "100",
      },
    ],
  });
  assert.deepEqual(result, { valid: true, errors: [] });
});

test("validateScenario rejects a step missing a required field", () => {
  const result = validateScenario({ steps: [{ contract: "token", method: "balance" }] });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /as/);
});

test("validateScenario rejects an empty steps array", () => {
  const result = validateScenario({ steps: [] });
  assert.equal(result.valid, false);
});

test("validateScenario rejects an arg value that's neither a scalar nor an {account} ref", () => {
  const result = validateScenario({
    steps: [{ contract: "token", as: "alice", method: "f", args: [{ name: "x", value: { nested: true } }] }],
  });
  assert.equal(result.valid, false);
});

test("the repo's example config and scenario files are both schema-valid", () => {
  const config = JSON.parse(fs.readFileSync(new URL("../examples/sandbox.config.json", import.meta.url)));
  assert.deepEqual(validateConfig(config), { valid: true, errors: [] });

  for (const file of ["../examples/scenario.example.json", "../examples/token.scenario.json"]) {
    const scenario = JSON.parse(fs.readFileSync(new URL(file, import.meta.url)));
    const result = validateScenario(scenario);
    assert.equal(result.valid, true, `${file}: ${result.errors.join(", ")}`);
  }
});
