import { runScenario } from "../lib/runScenario.js";

export async function runCommand(scenarioPath) {
  let outcome;
  try {
    outcome = await runScenario(scenarioPath);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
    return;
  }

  for (const r of outcome.results) {
    if (r.ok) {
      console.log(`[PASS] ${r.label}`);
    } else {
      console.error(`[FAIL] ${r.label}: ${r.error}`);
    }
  }

  console.log(`\n${outcome.passed} passed, ${outcome.failed} failed`);
  if (outcome.failed > 0) process.exitCode = 1;
}
