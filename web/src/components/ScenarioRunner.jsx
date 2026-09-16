import { useState } from "react";

export default function ScenarioRunner() {
  const [path, setPath] = useState("examples/scenario.example.json");
  const [outcome, setOutcome] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  async function handleRun() {
    if (!path.trim()) {
      setError("Scenario path cannot be empty.");
      setOutcome(null);
      return;
    }
    setRunning(true);
    setError(null);
    setOutcome(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioPath: path.trim() }),
      });
      let data;
      try {
        data = await res.json();
      } catch (_) {
        throw new Error(`Server returned HTTP ${res.status} (${res.statusText})`);
      }
      if (!res.ok) throw new Error(data?.error || `Scenario run failed with HTTP ${res.status}`);
      setOutcome(data);
    } catch (err) {
      setError(err.message || "Failed to contact scenario runner API");
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
          disabled={running}
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
        {running && (
          <p className="loading-state">
            Executing scenario steps against sandbox...
          </p>
        )}

        {error && (
          <div style={{ marginTop: 8 }} role="alert">
            <p className="step">
              <span className="fail font-bold">Runner Unavailable / Error:</span> {error}
            </p>
            <button
              className="retry-btn"
              onClick={handleRun}
              disabled={running}
              style={{ marginTop: 8 }}
            >
              Retry Scenario
            </button>
          </div>
        )}

        {outcome && (
          <div role="region" aria-label="Scenario execution outcome">
            {outcome.results.length === 0 ? (
              <p className="empty">Scenario completed with no steps executed.</p>
            ) : (
              outcome.results.map((r, i) => (
                <div className="step" key={i}>
                  {r.ok ? (
                    <span className="pass">PASS</span>
                  ) : (
                    <span className="fail">FAIL</span>
                  )}{" "}
                  — {r.label}
                  {!r.ok && r.error && <div className="mono">{r.error}</div>}
                </div>
              ))
            )}
            <div className="summary">
              {outcome.passed} passed, {outcome.failed} failed
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
