# Soroban Sandbox

A local testing sandbox for **Soroban** (Stellar's smart contract platform) — spin up a disposable local network, seed funded test accounts, deploy contracts, and run scripted scenarios, all without touching public Testnet.

## Why this exists

Most Soroban devs either run raw `soroban-cli` commands by hand against a local node, or write ad-hoc bash scripts to seed accounts and deploy contracts before every test run. There's no lightweight, reusable tool that wraps this into a repeatable workflow. **Soroban Sandbox** is that missing piece: a small CLI that any Soroban project can drop in to get a clean, seeded local environment in one command — and a JSON scenario format for scripting regression tests.

This is pure developer infrastructure. It doesn't compete with any existing project, and every team building on Soroban benefits from it existing.

## Commands

| Command | What it does |
|---|---|
| `sandbox init` | Starts a local Stellar/Soroban node via Docker (`stellar/quickstart`) and waits for it to become healthy |
| `sandbox seed --config <file>` | Generates and friendbot-funds test accounts from a JSON config |
| `sandbox deploy <wasm> [--as <account>] [--name <name>]` | Deploys a compiled contract, records its contract ID |
| `sandbox run <scenario.json>` | Executes a scripted sequence of contract calls; exits non-zero on any failure, so it's CI-friendly |
| `sandbox status` | Shows the running node, seeded accounts, and deployed contracts |
| `sandbox ui [--port <port>]` | Starts a local web dashboard (React) showing node status, accounts, contracts, and a scenario runner |
| `sandbox reset` | Stops the container and clears local state |

## Getting started

Requires [Docker](https://www.docker.com/) and the [Soroban / Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools) on your PATH.

```bash
npm install
node src/index.js init
node src/index.js seed --config examples/sandbox.config.json
node src/index.js deploy path/to/contract.wasm --as alice --name token
node src/index.js run examples/scenario.example.json
node src/index.js status
node src/index.js reset
```

See `examples/sandbox.config.json` and `examples/scenario.example.json` for the config formats.

## Dashboard (React)

`sandbox ui` starts a small Express API on top of your sandbox state, and can serve a built React dashboard:

```bash
cd web
npm install
npm run build     # builds the dashboard into web/dist
cd ..
node src/index.js ui   # serves it at http://localhost:4545
```

For dashboard development with hot reload instead, run the API and Vite dev server side by side:

```bash
node src/index.js ui          # terminal 1 — API on :4545
cd web && npm run dev         # terminal 2 — Vite dev server on :5173 (proxies /api to :4545)
```

The dashboard shows the running node's RPC info, seeded accounts, deployed contracts, and lets you trigger a scenario run and watch pass/fail results — all read-only against the same `.sandbox/*.json` state the CLI writes, no separate database.

## Status

Core CLI is implemented end-to-end (init → seed → deploy → run → status → reset). What's left is mostly hardening, testing, docs, and platform coverage — see `ISSUES.md` for a scoped backlog, sized so several contributors can pick up independent pieces in parallel.

## Contributing

`ISSUES.md` lists scoped tasks from "good first issue" up to bigger lifts (CI integration, TypeScript migration, multi-sandbox support). Each is independent enough to be picked up without blocking on another.

## License

MIT
