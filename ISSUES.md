# Issues / Roadmap

Core commands (`init`, `seed`, `deploy`, `run`, `status`, `reset`, `ui`) are implemented, including a React dashboard served over a local Express API. The tasks below are the remaining work — each is scoped to be pickable independently, so multiple contributors can work in parallel without blocking each other.

### Dashboard (React)

**#D1 — Deploy contracts from the UI (good first issue)**
Add a file upload + "Deploy" button to the dashboard that POSTs a `.wasm` file to a new `/api/deploy` route, which wraps the existing deploy logic.

**#D2 — Live scenario output via WebSocket (medium)**
`ScenarioRunner` currently waits for the whole scenario to finish before showing results. Stream step-by-step progress over a WebSocket (or SSE) instead, so long scenarios show live feedback.

**#D3 — Account balances in the dashboard (good first issue)**
`AccountsPanel` shows public keys but not live balances. Query the RPC's `getAccount` for each seeded account and display current balance.

**#D4 — Dashboard dark/light theme toggle (good first issue)**
`web/src/index.css` is dark-mode only. Add a theme toggle and a light palette.

**#D5 — Scenario file picker (medium)**
Replace the free-text path input in `ScenarioRunner` with a dropdown populated by scanning the project for `*.scenario.json` files via a new `/api/scenarios` route.

### Good first issues

**#1 — Add `--network` flag for testnet/futurenet**
Currently `init` only supports the local standalone network. Add a `--network <standalone|testnet|futurenet>` flag that adjusts the Docker command and RPC/passphrase config accordingly.

**#2 — Validate config/scenario files against a schema**
`seed` and `run` currently do a bare `JSON.parse` with minimal checks. Add JSON Schema validation (e.g. with `ajv`) for `sandbox.config.json` and scenario files, with clear error messages pointing at the bad field.

**#3 — `sandbox logs` command**
Add a command that tails `docker logs -f` for the running sandbox container, so users can debug node issues without knowing the container name.

**#4 — Friendbot retry/backoff in `seed`**
`seed` currently makes a single friendbot request per account with only a warning on failure. Add retry with backoff, and a `--retries` flag.

**#5 — `.sandbox/` gitignore check**
Add a startup check (in `init` or `seed`) that warns if `.sandbox/` isn't present in the project's `.gitignore`, since it holds funded account secret keys.

### Medium

**#6 — Unit tests for `src/lib/`**
Add a test suite (Vitest or Node's built-in test runner) covering `lib/shell.js` and `lib/state.js` — these are the two modules everything else depends on.

**#7 — Integration test: full lifecycle**
A test (can be a shell script or JS) that runs `init → seed → deploy → run → reset` against a real local Docker node and asserts each step succeeds. Useful both as a test and as living documentation.

**#8 — `--json` output mode**
Add a global `--json` flag so `status`, `deploy`, and `run` can emit machine-readable output instead of formatted console logs, for use in other tooling/CI.

**#9 — Example contract + walkthrough** — implemented
The repository includes a minimal example Soroban token contract (Rust) under `examples/contracts/`, a scenario file exercising it, and a step-by-step doc showing `init → seed → deploy → run` against it end to end.

**#10 — GitHub Actions CI workflow**
A `.github/workflows/ci.yml` that runs the full lifecycle from #7 in CI on every PR — both validates the tool and serves as a copyable template for other Soroban repos.

### Bigger lifts

**#11 — TypeScript migration**
Port `src/` to TypeScript with proper types for state files, scenario steps, and CLI options. Improves contributor experience and catches config-shape bugs at compile time.

**#12 — Multi-sandbox support**
Allow multiple named sandboxes to run concurrently (port allocation per instance, state namespaced under `.sandbox/<name>/`), for projects that need more than one isolated environment at once.

**#13 — Docs site**
A small docs site (VitePress or plain static MkDocs) covering installation, command reference, config formats, and a tutorial — published via GitHub Pages.

**#14 — Publish to npm**
Package and publish `soroban-sandbox` to npm as a global-installable CLI (`npm i -g soroban-sandbox`), with a release workflow.

**#15 — First-class Soroban Rust contract workflow**
This is now the primary language/tooling direction for contract development in the repository.
Expand the current Rust example into a realistic Soroban development workflow. Add a documented command for building Rust contracts to WASM, support contract tests run with `cargo test`, and update the scenario format or account resolution so contracts can use Soroban `Address` values and authorization instead of string account labels. Include a standards-compliant token example or clearly document the supported Soroban contract interface, and verify the complete Rust build → deploy → invoke flow in CI.
