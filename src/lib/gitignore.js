import { promises as fs } from "fs";
import path from "path";

const SANDBOX_DIR = ".sandbox";

/**
 * True if `.sandbox` (or a pattern that would match it, like `.sandbox/`
 * or `/.sandbox`) appears in the project's .gitignore. Doesn't try to be a
 * full gitignore-pattern matcher -- just enough to catch the common ways
 * someone would actually write this entry.
 */
export async function isSandboxDirGitignored(cwd = process.cwd()) {
  let contents;
  try {
    contents = await fs.readFile(path.join(cwd, ".gitignore"), "utf-8");
  } catch (err) {
    if (err.code === "ENOENT") return false;
    throw err;
  }

  return contents
    .split("\n")
    .map((line) => line.trim())
    .some((line) => {
      if (!line || line.startsWith("#")) return false;
      const normalized = line.replace(/^\//, "").replace(/\/$/, "");
      return normalized === SANDBOX_DIR || normalized === `${SANDBOX_DIR}/**` || normalized === `${SANDBOX_DIR}/*`;
    });
}

export async function warnIfSandboxDirNotGitignored(cwd = process.cwd()) {
  if (await isSandboxDirGitignored(cwd)) return;
  console.warn(
    `Warning: "${SANDBOX_DIR}" is not in .gitignore. It holds funded account secret keys -- ` +
      `add "${SANDBOX_DIR}/" to your .gitignore before committing.`,
  );
}
