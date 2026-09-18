import { runScenario } from "../lib/runScenario.js";
import { createLogger } from "../lib/logger.js";

export async function runCommand(scenarioPath, options = {}) {
  const log = createLogger({ quiet: options.quiet || options.json });
  let outcome;
  try {
    outcome = await runScenario(scenarioPath);
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }, null, 2));
    } else {
      log.error(err.message);
    }
    process.exitCode = 1;
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(outcome, null, 2));
  } else {
    for (const r of outcome.results) {
      if (r.ok) {
        log.info(`[PASS] ${r.label}`);
      } else {
        log.error(`[FAIL] ${r.label}: ${r.error}`);
      }
    }
    log.info(`\n${outcome.passed} tests passed, ${outcome.failed} tests failed`);
  }
  if (outcome.failed > 0) process.exitCode = 1;
}
