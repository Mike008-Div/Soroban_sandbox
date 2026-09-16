/** Small retry helper with exponential backoff. */
export async function withRetry(fn, { retries = 3, delayMs = 500, factor = 2, sleep = defaultSleep } = {}) {
  let attempt = 0;
  let delay = delayMs;
  // retries is the number of *extra* attempts after the first try.
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      await sleep(delay);
      delay *= factor;
    }
  }
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
