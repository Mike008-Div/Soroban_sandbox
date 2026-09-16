import { useEffect, useState, useCallback } from "react";
import StatusHeader from "./components/StatusHeader.jsx";
import AccountsPanel from "./components/AccountsPanel.jsx";
import ContractsPanel from "./components/ContractsPanel.jsx";
import ScenarioRunner from "./components/ScenarioRunner.jsx";

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    let msg = `HTTP ${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data && data.error) msg = data.error;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

export default function App() {
  const [status, setStatus] = useState(null);
  const [accounts, setAccounts] = useState({});
  const [contracts, setContracts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);

  const refresh = useCallback(async (isManualRetry = false) => {
    if (isManualRetry) setRetrying(true);
    try {
      const [s, a, c] = await Promise.all([
        getJson("/api/status"),
        getJson("/api/accounts"),
        getJson("/api/contracts"),
      ]);
      setStatus(s);
      setAccounts(a || {});
      setContracts(c || {});
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to connect to Sandbox API");
    } finally {
      setLoading(false);
      if (isManualRetry) setRetrying(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => refresh(false), 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="app">
  <a href="#main-content" className="skip-link">
    Skip to main content
  </a>
  <header className="app-header">
        <div>
          <h1>Soroban Sandbox</h1>
          <p className="subtitle">Local dev dashboard — accounts, contracts, and scenario runs.</p>
        </div>
        {error && (
          <button
            className="retry-btn"
            onClick={() => refresh(true)}
            disabled={retrying}
            aria-label="Retry connection to Sandbox API"
          >
            {retrying ? "Retrying..." : "Retry Connection"}
          </button>
        )}
      </header>

      {error && (
        <div className="panel error-panel" role="alert">
          <div>
            <span className="fail font-bold">API Connection Error:</span> {error}
          </div>
          <p className="empty" style={{ margin: "8px 0 12px 0" }}>
            The dashboard could not reach the Sandbox API server. Ensure <code>sandbox ui</code> is running.
          </p>
          <button onClick={() => refresh(true)} disabled={retrying}>
            {retrying ? "Retrying..." : "Retry Now"}
          </button>
        </div>
      )}

      <main id="main-content">
        <StatusHeader status={status} loading={loading && !status} error={error} />
        <AccountsPanel accounts={accounts} loading={loading && Object.keys(accounts).length === 0} />
        <ContractsPanel contracts={contracts} loading={loading && Object.keys(contracts).length === 0} />
        <ScenarioRunner />
      </main>
    </div>
  );
}
