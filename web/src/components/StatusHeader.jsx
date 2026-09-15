export default function StatusHeader({ status }) {
  const running = status?.running;
  return (
    <div className="panel">
      <h2>Sandbox Node</h2>
      {running ? (
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
    </div>
  );
}
