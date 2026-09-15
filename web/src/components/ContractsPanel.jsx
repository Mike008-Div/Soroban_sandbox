export default function ContractsPanel({ contracts }) {
  const names = Object.keys(contracts);
  return (
    <section className="panel" aria-labelledby="contracts-heading">
      <h2 id="contracts-heading">Contracts ({names.length})</h2>
      {names.length === 0 ? (
        <p className="empty">
          No contracts deployed yet. Run <code>sandbox deploy &lt;wasm&gt;</code>.
        </p>
      ) : (
        names.map((name) => (
          <div className="row" key={name}>
            <span>{name}</span>
            <span className="mono">{contracts[name].contractId}</span>
          </div>
        ))
      )}
    </section>
  );
}
