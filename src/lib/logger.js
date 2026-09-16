/**
 * A small logger so commands don't call console.log/warn directly.
 * In quiet mode, info/warn are suppressed -- only errors are printed, so
 * scripts and CI can pipe a command's output without formatted noise while
 * still seeing real failures. Errors are never suppressed.
 */
export function createLogger({ quiet = false } = {}) {
  return {
    info(...args) {
      if (!quiet) console.log(...args);
    },
    warn(...args) {
      if (!quiet) console.warn(...args);
    },
    error(...args) {
      console.error(...args);
    },
  };
}
