import { promises as fs } from "fs";
import path from "path";

const SANDBOX_DIR = ".sandbox";

function filePath(name) {
  return path.join(process.cwd(), SANDBOX_DIR, name);
}

async function ensureDir() {
  await fs.mkdir(path.join(process.cwd(), SANDBOX_DIR), { recursive: true });
}

export async function readJson(name, fallback = null) {
  try {
    const raw = await fs.readFile(filePath(name), "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

export async function writeJson(name, data) {
  await ensureDir();
  await fs.writeFile(filePath(name), JSON.stringify(data, null, 2));
}

export async function clearState() {
  await fs.rm(path.join(process.cwd(), SANDBOX_DIR), { recursive: true, force: true });
}

export async function sandboxDirExists(cwd = process.cwd()) {
  try {
    await fs.access(path.join(cwd, SANDBOX_DIR));
    return true;
  } catch {
    return false;
  }
}

export const STATE_FILE = "state.json";
export const ACCOUNTS_FILE = "accounts.json";
export const CONTRACTS_FILE = "contracts.json";
