import test from "node:test";
import assert from "node:assert/strict";
import {
  generateBashCompletion,
  generateZshCompletion,
  generatePowerShellCompletion,
  completionCommand,
} from "../src/commands/completion.js";

test("generateBashCompletion lists every command in the completion word list", () => {
  const script = generateBashCompletion(["init", "seed"]);
  assert.match(script, /compgen -W "init seed"/);
  assert.match(script, /complete -F _sandbox_completions sandbox/);
});

test("generateZshCompletion lists every command", () => {
  const script = generateZshCompletion(["init", "seed"]);
  assert.match(script, /commands=\('init' 'seed'\)/);
});

test("generatePowerShellCompletion lists every command", () => {
  const script = generatePowerShellCompletion(["init", "seed"]);
  assert.match(script, /@\('init', 'seed'\)/);
});

test("completionCommand prints the requested shell's script to stdout", () => {
  const written = [];
  const original = process.stdout.write;
  process.stdout.write = (chunk) => {
    written.push(chunk);
    return true;
  };
  try {
    completionCommand("bash");
  } finally {
    process.stdout.write = original;
  }
  assert.match(written.join(""), /_sandbox_completions/);
});

test("completionCommand errors on an unsupported shell", () => {
  const original = console.error;
  const errors = [];
  console.error = (msg) => errors.push(msg);
  try {
    completionCommand("fish");
  } finally {
    console.error = original;
    process.exitCode = 0; // completionCommand sets exitCode = 1 on failure
  }
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Unknown shell "fish"/);
});
