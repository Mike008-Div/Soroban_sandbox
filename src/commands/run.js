import { runScenario } from "../lib/runScenario.js";
import { createLogger } from "../lib/logger.js";

export async function runCommand(scenarioPath, options = {}) {
  const log = createLogger(options);
  let outcome;
  try {
    outcome = await runScenario(scenarioPath);
  } catch (err) {
    log.error(err.message);
    process.exitCode = 1;
    return;
  }

  for (const r of outcome.results) {
    if (r.ok) {
      log.info(`[PASS] ${r.label}`);
    } else {
      log.error(`[FAIL] ${r.label}: ${r.error}`);
    }
  }

  log.info(`\n${outcome.passed} passed, ${outcome.failed} failed`);
  if (outcome.failed > 0) process.exitCode = 1;
}
