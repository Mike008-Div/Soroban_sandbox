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

const program = new Command();

program
  .name("sandbox")
  .description("Local testing sandbox for Soroban smart contracts")
  .version("0.1.0");

program
  .command("init")
  .description("Spin up a local Soroban/Stellar network")
  .action(initCommand);

program
  .command("seed")
  .description("Create and fund test accounts from a config file")
  .option("-c, --config <path>", "path to seed config JSON", "sandbox.config.json")
  .action(seedCommand);

program
  .command("deploy <wasmPath>")
  .description("Deploy a compiled contract WASM to the sandbox")
  .option("--as <accountName>", "account to deploy from (defaults to first seeded account)")
  .option("--name <contractName>", "name to register the contract under (defaults to wasm filename)")
  .action(deployCommand);

program
  .command("run <scenarioPath>")
  .description("Run a scripted scenario of contract calls")
  .action(runCommand);

program
  .command("status")
  .description("Show the current sandbox state (node, accounts, contracts)")
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
