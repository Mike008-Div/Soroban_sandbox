/**
 * Registers a cleanup callback to run on SIGINT/SIGTERM before the process
 * exits. Multiple calls (e.g. one for in-flight child processes, one for
 * the dashboard's HTTP server) all get awaited together on a single
 * signal, rather than each installing its own handler and racing each
 * other's process.exit() -- the first callback registered would otherwise
 * always win and cut off any slower one (like a graceful server.close()).
 *
 * `signalSource` defaults to the real `process` and only needs overriding
 * in tests: emitting a real SIGINT at the process during a test run is
 * also seen by Node's own test runner, which cancels the rest of the
 * suite -- tests pass a plain EventEmitter instead.
 *
 * Returns a function that unregisters this particular cleanup callback.
 */
const cleanups = new Set();
let listeners = null; // { onSigint, onSigterm, signalSource }
let shuttingDown = false;

function install(onExit, signalSource) {
  if (listeners) return;

  const run = async (signal) => {
    if (shuttingDown) {
      onExit(1);
      return;
    }
    shuttingDown = true;
    try {
      await Promise.all([...cleanups].map((fn) => fn(signal)));
    } finally {
      onExit(signal === "SIGINT" ? 130 : 143);
    }
  };

  // process.on('SIGINT'/'SIGTERM', listener) does not pass the signal name
  // to the listener, so each needs its own closure to know which one fired.
  const onSigint = () => run("SIGINT");
  const onSigterm = () => run("SIGTERM");
  signalSource.on("SIGINT", onSigint);
  signalSource.on("SIGTERM", onSigterm);
  listeners = { onSigint, onSigterm, signalSource };
}

export function registerShutdownHandler(cleanup, { onExit = process.exit, signalSource = process } = {}) {
  install(onExit, signalSource);
  cleanups.add(cleanup);
  return () => cleanups.delete(cleanup);
}

/** Test-only: resets module state (including removing installed listeners) between tests. */
export function _resetForTests() {
  if (listeners) {
    listeners.signalSource.off("SIGINT", listeners.onSigint);
    listeners.signalSource.off("SIGTERM", listeners.onSigterm);
  }
  cleanups.clear();
  listeners = null;
  shuttingDown = false;
}
