import test from "node:test";
import assert from "node:assert/strict";
import { validateScenarioReferences, matchesExpectation } from "../src/lib/runScenario.js";

const accounts = { alice: { publicKey: "GALICE" }, bob: { publicKey: "GBOB" } };
const contracts = { token: { contractId: "CTOKEN" } };

test("validateScenarioReferences passes when everything referenced exists", () => {
  const steps = [
    { label: "s1", contract: "token", as: "alice", args: [{ name: "to", value: { account: "bob" } }] },
  ];
  assert.deepEqual(validateScenarioReferences(steps, accounts, contracts), { valid: true, errors: [] });
});

test("validateScenarioReferences reports an unknown contract", () => {
  const steps = [{ label: "s1", contract: "nope", as: "alice" }];
  const result = validateScenarioReferences(steps, accounts, contracts);
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /unknown contract "nope"/);
});

test("validateScenarioReferences reports an unknown 'as' account", () => {
  const steps = [{ label: "s1", contract: "token", as: "carol" }];
  const result = validateScenarioReferences(steps, accounts, contracts);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /unknown account "carol"/);
});

test("validateScenarioReferences reports an unknown account referenced in an arg", () => {
  const steps = [{ label: "s1", contract: "token", as: "alice", args: [{ name: "to", value: { account: "dave" } }] }];
  const result = validateScenarioReferences(steps, accounts, contracts);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /arg "to": unknown account "dave"/);
});

test("validateScenarioReferences reports every missing reference across every step, not just the first", () => {
  const steps = [
    { label: "s1", contract: "nope1", as: "alice" },
    { label: "s2", contract: "token", as: "nope2" },
    { label: "s3", contract: "token", as: "alice", args: [{ name: "to", value: { account: "nope3" } }] },
  ];
  const result = validateScenarioReferences(steps, accounts, contracts);
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 3);
});

test("validateScenarioReferences ignores non-account-ref arg values", () => {
  const steps = [{ label: "s1", contract: "token", as: "alice", args: [{ name: "amount", value: 100 }] }];
  assert.deepEqual(validateScenarioReferences(steps, accounts, contracts), { valid: true, errors: [] });
});

test("matchesExpectation unwraps a JSON-quoted string before comparing (the CLI's actual output shape for i128 balances)", () => {
  assert.equal(matchesExpectation('"100"', "100"), true);
  assert.equal(matchesExpectation('"100"', 100), true);
});

test("matchesExpectation matches a bare JSON number too", () => {
  assert.equal(matchesExpectation("100", "100"), true);
});

test("matchesExpectation falls back to a plain string compare for non-JSON output", () => {
  assert.equal(matchesExpectation("hello world", "hello world"), true);
  assert.equal(matchesExpectation("hello world", "goodbye"), false);
});

test("matchesExpectation rejects an actually wrong value", () => {
  assert.equal(matchesExpectation('"100"', "200"), false);
});
