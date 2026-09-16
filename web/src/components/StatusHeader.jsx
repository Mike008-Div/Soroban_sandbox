export default function StatusHeader({ status, loading, error }) {
  if (loading) {
    return (
      <div className="panel">
        <h2>Sandbox Node</h2>
        <p className="empty">Loading node status...</p>
      </div>
    );
  }

  const running = status?.running;
  return (
    <section className="panel" aria-labelledby="status-heading">
      <h2 id="status-heading">Sandbox Node</h2>
      {error && !status ? (
        <>
          <div className="row">
            <span>Status</span>
            <span className="badge stopped">unavailable</span>
          </div>
          <p className="empty">Cannot determine node status while API is unreachable.</p>
        </>
      ) : running ? (
        <>
          <div className="row">
            <span>Status</span>
            <span className="badge running">running</span>
          </div>
          <div className="row">
            <span>RPC URL</span>
            <span className="mono">{status.rpcUrl}</span>
          </div>
          <div className="row">
            <span>Network passphrase</span>
            <span className="mono">{status.networkPassphrase}</span>
          </div>
          <div className="row">
            <span>Started</span>
            <span className="mono">{status.startedAt}</span>
          </div>
        </>
      ) : (
        <>
          <div className="row">
            <span>Status</span>
            <span className="badge stopped">not running</span>
          </div>
          <p className="empty">Run <code>sandbox init</code> in your terminal to start a local node.</p>
        </>
      )}
    </section>
  );
}
