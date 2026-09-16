import { spawn } from "child_process";

// Stellar secret keys ("S" + 55 base32 chars) and known flags that take
// one. Command failures echo the full argument list in their error
// message (see redactArgs below); without this, a failed `soroban
// contract deploy --source <secret> ...` would print the account's
// secret key straight to the terminal, and (via runScenario's error
// results) to the dashboard's /api/run response too.
const SECRET_KEY_PATTERN = /^S[A-Z2-7]{55}$/;
const SECRET_BEARING_FLAGS = new Set(["--source", "--source-account", "--secret-key"]);

/** Replaces Stellar secret keys (and the value of known secret-bearing flags) with a placeholder. */
export function redactArgs(args) {
  return args.map((arg, i) => {
    if (SECRET_KEY_PATTERN.test(arg)) return "[REDACTED]";
    if (i > 0 && SECRET_BEARING_FLAGS.has(args[i - 1])) return "[REDACTED]";
    return arg;
  });
}

/** Replaces any bare Stellar secret key appearing anywhere in free-form text (e.g. CLI stderr) with a placeholder. */
export function redactText(text) {
  return text.replace(/\bS[A-Z2-7]{55}\b/g, "[REDACTED]");
}

// Child processes currently in flight, so a SIGINT/SIGTERM handler can kill
// them instead of leaving them orphaned when only the parent Node process
// receives the signal (the usual case outside an interactive terminal --
// e.g. under a process manager or `docker compose`-style supervisor).
const activeChildren = new Set();

/** Sends `signal` to every currently in-flight child process spawned via run(). */
export function killActiveChildren(signal = "SIGTERM") {
  for (const child of activeChildren) {
    child.kill(signal);
  }
}

/**
 * Run a shell command, streaming output to the console (unless silent),
 * and resolve with { code, stdout, stderr }. Rejects on non-zero exit
 * unless allowFailure is set.
 */
export function run(cmd, args = [], { cwd, silent = false, allowFailure = false, env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: process.platform === "win32",
    });
    activeChildren.add(child);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (!silent) process.stdout.write(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (!silent) process.stderr.write(chunk);
    });

    child.on("error", (err) => {
      activeChildren.delete(child);
      reject(err);
    });

    child.on("close", (code) => {
      activeChildren.delete(child);
      if (code !== 0 && !allowFailure) {
        reject(
          new Error(`Command failed (exit ${code}): ${cmd} ${redactArgs(args).join(" ")}\n${redactText(stderr)}`),
        );
      } else {
        resolve({ code, stdout, stderr });
      }
    });
  });
}

export async function commandExists(cmd) {
  const probe = process.platform === "win32" ? "where" : "which";
  const res = await run(probe, [cmd], { silent: true, allowFailure: true });
  return res.code === 0;
}
