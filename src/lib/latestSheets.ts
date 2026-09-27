import { promises as fs } from "fs";
import path from "path";
import type { PrepSheetInput, PrepSheetOutput } from "./claude";

export interface StoredSheet {
  input: PrepSheetInput;
  output: PrepSheetOutput;
  generatedAt: string;
}

// Bump when PrepSheetInput/PrepSheetOutput change shape, so a file written by
// older code is ignored instead of crashing the dashboard render.
const STORE_VERSION = 2;

interface StoreFile {
  version: number;
  sheets: Record<string, StoredSheet>;
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

export async function readLatestSheets(symbols: string[]): Promise<StoredSheet[]> {
  const store = await readStore();
  return symbols.flatMap((s) => (store.sheets[s] ? [store.sheets[s]] : []));
}

export async function saveLatestSheets(sheets: StoredSheet[]): Promise<void> {
  const store = await readStore();
  for (const sheet of sheets) store.sheets[sheet.output.symbol] = sheet;

  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  const tmpPath = `${STORE_PATH}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(store));
  await fs.rename(tmpPath, STORE_PATH);
}
