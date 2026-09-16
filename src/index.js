#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { seedCommand } from "./commands/seed.js";
import { deployCommand } from "./commands/deploy.js";
import { runCommand } from "./commands/run.js";
import { resetCommand } from "./commands/reset.js";
import { statusCommand } from "./commands/status.js";
import { uiCommand } from "./commands/ui.js";
import { logsCommand } from "./commands/logs.js";
import { killActiveChildren } from "./lib/shell.js";
import { registerShutdownHandler } from "./lib/shutdown.js";

// Ensures a command like `sandbox logs` (which streams `docker logs -f`
// indefinitely) doesn't leave that child process orphaned if this process
// is killed by something other than an interactive terminal's Ctrl+C,
// which normally signals the whole process group for you.
registerShutdownHandler((signal) => {
  killActiveChildren(signal);
});

const program = new Command();

program
  .name("sandbox")
  .description("Local testing sandbox for Soroban smart contracts")
  .version("0.1.0");

program
  .command("init")
  .description("Spin up a local Soroban/Stellar network")
  .option("--health-retries <n>", "health-check attempts before giving up (default 30)")
  .option("--health-delay <ms>", "milliseconds between health-check attempts (default 2000)")
  .option("--port <port>", "local RPC/host port to use, if 8000 is already taken (default 8000)")
  .option("-q, --quiet", "suppress non-error output (for scripts/CI)")
  .action(initCommand);

program
  .command("seed")
  .description("Create and fund test accounts from a config file")
  .option("-c, --config <path>", "path to seed config JSON", "sandbox.config.json")
  .option("--retries <n>", "friendbot retry attempts after the first try (default 3)")
  .option("-q, --quiet", "suppress non-error output (for scripts/CI)")
  .action(seedCommand);

program
  .command("deploy <wasmPath>")
  .description("Deploy a compiled contract WASM to the sandbox")
  .option("--as <accountName>", "account to deploy from (defaults to first seeded account)")
  .option("--name <contractName>", "name to register the contract under (defaults to wasm filename)")
  .option("-q, --quiet", "suppress non-error output (for scripts/CI)")
  .option("--json", "print a single machine-readable JSON result instead of formatted output")
  .action(deployCommand);

program
  .command("run <scenarioPath>")
  .description("Run a scripted scenario of contract calls")
  .option("-q, --quiet", "suppress [PASS] lines and the summary; [FAIL] lines still print")
  .option("--json", "print the full result as JSON instead of formatted [PASS]/[FAIL] lines")
  .action(runCommand);

program
  .command("status")
  .description("Show the current sandbox state (node, accounts, contracts)")
  .option("--json", "print status as JSON instead of formatted output")
  .action(statusCommand);

program
  .command("ui")
  .description("Start the local web dashboard (accounts, contracts, scenario runner)")
  .option("-p, --port <port>", "port to serve on", "4545")
  .action(uiCommand);

program
  .command("logs")
  .description("Tail logs from the running sandbox container")
  .option("--no-follow", "print current logs and exit, instead of streaming")
  .option("--tail <lines>", "number of recent lines to show before following")
  .action(logsCommand);

program
  .command("reset")
  .description("Tear down and restart a clean sandbox")
  .option("--dry-run", "print what would be done without changing anything")
  .action(resetCommand);

program.parse();
