import { spawn } from "child_process";

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

    child.on("error", (err) => reject(err));

    child.on("close", (code) => {
      if (code !== 0 && !allowFailure) {
        reject(new Error(`Command failed (exit ${code}): ${cmd} ${args.join(" ")}\n${stderr}`));
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
