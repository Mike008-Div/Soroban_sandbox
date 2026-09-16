import { run } from "../lib/shell.js";
import { readJson, STATE_FILE } from "../lib/state.js";

export function buildLogsArgs(containerName, options = {}) {
  const args = ["logs"];
  if (options.follow !== false) args.push("-f");
  if (options.tail) args.push("--tail", String(options.tail));
  args.push(containerName);
  return args;
}

export async function logsCommand(options = {}) {
  const state = await readJson(STATE_FILE);
  if (!state?.running) {
    console.error("No running sandbox found. Run `sandbox init` first.");
    process.exitCode = 1;
    return;
  }

  const args = buildLogsArgs(state.containerName, options);

  try {
    // allowFailure: docker logs exits non-zero when the container stops or
    // the stream is interrupted (e.g. Ctrl+C); neither is a real failure.
    await run("docker", args, { allowFailure: true });
  } catch (err) {
    // spawn itself failed -- most likely docker isn't installed.
    console.error(err.message);
    process.exitCode = 1;
  }
}
