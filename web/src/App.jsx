import { useEffect, useState } from "react";
import StatusHeader from "./components/StatusHeader.jsx";
import AccountsPanel from "./components/AccountsPanel.jsx";
import ContractsPanel from "./components/ContractsPanel.jsx";
import ScenarioRunner from "./components/ScenarioRunner.jsx";

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

export default function App() {
  const [status, setStatus] = useState(null);
  const [accounts, setAccounts] = useState({});
  const [contracts, setContracts] = useState({});

  async function refresh() {
    const [s, a, c] = await Promise.all([
      getJson("/api/status"),
      getJson("/api/accounts"),
      getJson("/api/contracts"),
    ]);
    setStatus(s);
    setAccounts(a);
    setContracts(c);
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header>
        <h1>Soroban Sandbox</h1>
        <p className="subtitle">Local dev dashboard — accounts, contracts, and scenario runs.</p>
      </header>

      <main id="main-content">
        <StatusHeader status={status} />
        <AccountsPanel accounts={accounts} />
        <ContractsPanel contracts={contracts} />
        <ScenarioRunner />
      </main>
    </div>
  );
}
