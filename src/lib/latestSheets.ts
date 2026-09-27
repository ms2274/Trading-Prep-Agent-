import { promises as fs } from "fs";
import path from "path";
import type { PrepSheetInput, PrepSheetOutput } from "./claude";

export interface StoredSheet {
  input: PrepSheetInput;
  output: PrepSheetOutput;
  generatedAt: string;
}

export interface SymbolFailure {
  symbol: string;
  error: string;
  at: string;
}

// Bump when PrepSheetInput/PrepSheetOutput change shape, so a file written by
// older code is ignored instead of crashing the dashboard render.
const STORE_VERSION = 2;

interface StoreFile {
  version: number;
  sheets: Record<string, StoredSheet>;
  // Last refresh failure per symbol, cleared when that symbol next succeeds —
  // so a failed symbol still explains itself after the app is reopened.
  failures?: Record<string, SymbolFailure>;
}

// Kept on local disk rather than in Supabase: free-tier Supabase projects pause
// after a week of inactivity, and the app should always open to the last sheet.
const STORE_PATH = path.join(process.cwd(), "data", "latest-sheets.json");

async function readStore(): Promise<StoreFile> {
  try {
    const parsed = JSON.parse(await fs.readFile(STORE_PATH, "utf8")) as StoreFile;
    if (parsed.version === STORE_VERSION && parsed.sheets) return parsed;
  } catch {
    // Missing or unreadable file — treated as no saved sheets.
  }
  return { version: STORE_VERSION, sheets: {} };
}

export async function readLatestSheets(symbols: string[]): Promise<{ sheets: StoredSheet[]; failures: SymbolFailure[] }> {
  const store = await readStore();
  return {
    sheets: symbols.flatMap((s) => (store.sheets[s] ? [store.sheets[s]] : [])),
    failures: symbols.flatMap((s) => (store.failures?.[s] ? [store.failures[s]] : [])),
  };
}

export async function saveLatestSheets(sheets: StoredSheet[], failures: SymbolFailure[]): Promise<void> {
  const store = await readStore();
  store.failures = store.failures ?? {};
  for (const sheet of sheets) {
    store.sheets[sheet.output.symbol] = sheet;
    delete store.failures[sheet.output.symbol];
  }
  for (const failure of failures) store.failures[failure.symbol] = failure;

  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  const tmpPath = `${STORE_PATH}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(store));
  await fs.rename(tmpPath, STORE_PATH);
}
