import { useState } from "react";

export default function ScenarioRunner() {
  const [path, setPath] = useState("examples/scenario.example.json");
  const [outcome, setOutcome] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  async function handleRun() {
    setRunning(true);
    setError(null);
    setOutcome(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioPath: path }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scenario run failed");
      setOutcome(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="scenario-heading">
      <h2 id="scenario-heading">Run a Scenario</h2>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="scenario-path" className="visually-hidden">
          Scenario JSON file path
        </label>
        <input
          id="scenario-path"
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !running) {
              e.preventDefault();
              handleRun();
            }
          }}
          placeholder="path/to/scenario.json"
          aria-label="Scenario JSON file path"
        />
        <button
          onClick={handleRun}
          disabled={running}
          aria-label={running ? "Executing scenario..." : "Run scenario"}
        >
          {running ? "Running..." : "Run"}
        </button>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {error && (
          <p className="step" role="alert">
            <span className="fail">Error:</span> {error}
          </p>
        )}

        {outcome && (
          <div role="region" aria-label="Scenario execution outcome">
            {outcome.results.map((r, i) => (
              <div className="step" key={i}>
                {r.ok ? (
                  <span className="pass">PASS</span>
                ) : (
                  <span className="fail">FAIL</span>
                )}{" "}
                — {r.label}
                {!r.ok && r.error && <div className="mono">{r.error}</div>}
              </div>
            ))}
            <div className="summary">
              {outcome.passed} passed, {outcome.failed} failed
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
