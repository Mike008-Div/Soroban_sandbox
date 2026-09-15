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
    <div className="panel">
      <h2>Run a Scenario</h2>
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="path/to/scenario.json"
        />
        <button onClick={handleRun} disabled={running}>
          {running ? "Running..." : "Run"}
        </button>
      </div>

      {error && <p className="step"><span className="fail">Error:</span> {error}</p>}

      {outcome && (
        <>
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
        </>
      )}
    </div>
  );
}
