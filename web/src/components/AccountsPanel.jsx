export default function AccountsPanel({ accounts }) {
  const names = Object.keys(accounts);
  return (
    <section className="panel" aria-labelledby="accounts-heading">
      <h2 id="accounts-heading">Accounts ({names.length})</h2>
      {names.length === 0 ? (
        <p className="empty">
          No accounts yet. Run <code>sandbox seed --config sandbox.config.json</code>.
        </p>
      ) : (
        names.map((name) => (
          <div className="row" key={name}>
            <span>{name}</span>
            <span className="mono">{accounts[name].publicKey}</span>
          </div>
        ))
      )}
    </section>
  );
}
