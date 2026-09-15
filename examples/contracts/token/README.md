# Sandbox token contract

This is a small Soroban Rust contract used by the sandbox walkthrough. It stores balances under string labels (`alice`, `bob`, and so on) so it can be driven by the sandbox's current JSON scenario format.

On Windows, Cargo also requires Visual Studio Build Tools with the **Desktop development with C++** workload. Without `link.exe`, the Rust build and test commands cannot compile their dependencies.

It is intentionally a teaching fixture, not a production token: there is no authorization, metadata, allowance, or Stellar `Address` handling. A real token should follow Soroban's token standards and require authorization for state-changing operations.

## Build and run

From the repository root, install the Rust target and build the WASM:

```bash
rustup target add wasm32-unknown-unknown
npm run contract:build
```

Run the contract's Rust tests with:

```bash
npm run contract:test
```

Then start the sandbox, deploy the generated WASM, and run the scenario:

```bash
node src/index.js init
node src/index.js seed --config examples/sandbox.config.json
node src/index.js deploy examples/contracts/token/target/wasm32-unknown-unknown/release/sandbox_token.wasm --as alice --name token
node src/index.js run examples/token.scenario.json
```

The scenario should report three passing steps. Reset the disposable network when finished:

```bash
node src/index.js reset
```