import { promises as fs } from "fs";
import path from "path";
import type { OptionsPlay, SupplyDemandZoneDetail } from "./claude";
import type { StoredSheet } from "./latestSheets";

export interface HistoryEntry {
  symbol: string;
  date: string; // ET trade date the sheet was generated for
  generatedAt: string;
  plays: OptionsPlay[];
  supplyZones: SupplyDemandZoneDetail[];
  demandZones: SupplyDemandZoneDetail[];
}

interface HistoryFile {
  version: number;
  entries: HistoryEntry[];
}

const HISTORY_VERSION = 1;
const MAX_ENTRIES = 250;
const DATA_DIR = path.join(process.cwd(), "data");
const HISTORY_PATH = path.join(DATA_DIR, "history.json");
const LATEST_PATH = path.join(DATA_DIR, "latest-sheets.json");

function toEntry(sheet: Pick<StoredSheet, "output" | "generatedAt">): HistoryEntry {
  const { output } = sheet;
  return {
    symbol: output.symbol,
    date: output.date,
    generatedAt: sheet.generatedAt,
    plays: output.optionsPlays,
    supplyZones: output.supplyZones,
    demandZones: output.demandZones,
  };
}

// First run: start the history from whatever latest sheets already exist
// (any store version — the output fields used here haven't changed shape).
async function seedFromLatest(): Promise<HistoryEntry[]> {
  try {
    const raw = JSON.parse(await fs.readFile(LATEST_PATH, "utf8"));
    const sheets = Object.values(raw?.sheets ?? {}) as StoredSheet[];
    return sheets.filter((s) => Array.isArray(s?.output?.optionsPlays) && s.generatedAt).map(toEntry);
  } catch {
    return [];
  }
}

export async function readHistory(): Promise<HistoryEntry[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(HISTORY_PATH, "utf8")) as HistoryFile;
    if (parsed.version === HISTORY_VERSION && Array.isArray(parsed.entries)) return parsed.entries;
  } catch {
    // Missing or unreadable — fall through to seeding.
  }
  return seedFromLatest();
}

// Keeps one entry per symbol per trade date (the latest refresh wins, since
// that's the sheet the trader last looked at).
export async function appendHistory(sheets: StoredSheet[]): Promise<void> {
  const entries = await readHistory();
  for (const sheet of sheets) {
    const entry = toEntry(sheet);
    const idx = entries.findIndex((e) => e.symbol === entry.symbol && e.date === entry.date);
    if (idx >= 0) entries[idx] = entry;
    else entries.push(entry);
  }
  entries.sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));

  const file: HistoryFile = { version: HISTORY_VERSION, entries: entries.slice(-MAX_ENTRIES) };
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmpPath = `${HISTORY_PATH}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(file));
  await fs.rename(tmpPath, HISTORY_PATH);
}
