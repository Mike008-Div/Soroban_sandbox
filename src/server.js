import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { readJson, STATE_FILE, ACCOUNTS_FILE, CONTRACTS_FILE } from "./lib/state.js";
import { runScenario } from "./lib/runScenario.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createServer() {
  const app = express();
  app.use(express.json());

  app.get("/api/status", async (req, res) => {
    const state = await readJson(STATE_FILE);
    res.json(state || { running: false });
  });

  app.get("/api/accounts", async (req, res) => {
    const accounts = await readJson(ACCOUNTS_FILE, {});
    // never send secret keys to the browser
    const safe = Object.fromEntries(
      Object.entries(accounts).map(([name, a]) => [
        name,
        { publicKey: a.publicKey, startingBalance: a.startingBalance },
      ])
    );
    res.json(safe);
  });

  app.get("/api/contracts", async (req, res) => {
    const contracts = await readJson(CONTRACTS_FILE, {});
    res.json(contracts);
  });

  app.post("/api/run", async (req, res) => {
    const { scenarioPath } = req.body;
    if (!scenarioPath) {
      return res.status(400).json({ error: "scenarioPath is required" });
    }
    try {
      const outcome = await runScenario(scenarioPath);
      res.json(outcome);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // serve the built dashboard, if present (after `cd web && npm run build`)
  const distDir = path.join(__dirname, "..", "web", "dist");
  app.use(express.static(distDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(distDir, "index.html"), (err) => {
      if (err) res.status(404).send("Dashboard not built yet. Run `cd web && npm install && npm run build`.");
    });
  });

  return app;
}
