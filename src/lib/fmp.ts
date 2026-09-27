const FMP_BASE_URL = "https://financialmodelingprep.com/stable";

function requireApiKey(): string {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error("Missing FMP_API_KEY env var");
  return key;
}

async function fmpGet(path: string, params: Record<string, string>): Promise<unknown> {
  const query = new URLSearchParams({ ...params, apikey: requireApiKey() });
  const res = await fetch(`${FMP_BASE_URL}/${path}?${query}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`FMP ${path} failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return res.json();
}

export interface VixQuote {
  price: number;
  changePercent: number;
}

export async function fetchVixQuote(): Promise<VixQuote> {
  const json = await fmpGet("quote", { symbol: "^VIX" });
  const quote = Array.isArray(json) ? json[0] : undefined;
  if (!quote || typeof quote.price !== "number") {
    throw new Error(`Unexpected FMP response shape: ${JSON.stringify(json).slice(0, 500)}`);
  }
  return { price: quote.price, changePercent: quote.changePercentage ?? 0 };
}

export interface EconomicEvent {
  date: string; // ET, YYYY-MM-DD
  time: string | null; // ET, HH:MM (24h)
  names: string[];
}

export interface EarningsEvent {
  symbol: string;
  date: string; // YYYY-MM-DD
  timing: string | null; // "bmo" / "amc" when FMP provides it
}

// Releases that reliably move SPY/QQQ; matched in addition to FMP's own
// "High" impact flag in case that field is missing or mislabelled.
const KEY_RELEASE = /CPI|Consumer Price|Nonfarm|Non Farm|Payrolls|FOMC|Fed Interest Rate|Federal Funds|Fed Chair|Powell|PCE|GDP|PPI|Producer Price|Retail Sales|Unemployment Rate|ISM/i;

// Mega-caps whose earnings move the index ETFs.
export const EARNINGS_WATCHLIST = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "AVGO", "TSLA", "NFLX", "COST", "AMD", "JPM"];

const ET_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
const ET_TIME = new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false });

// FMP economic-calendar timestamps are "YYYY-MM-DD HH:MM:SS" in UTC.
// (Unverified from the cloud sandbox — a CPI/NFP release should come out as 08:30 ET.)
function toEt(fmpDate: string): { date: string; time: string | null } {
  const hasTime = /\d{2}:\d{2}/.test(fmpDate);
  const d = new Date(hasTime ? `${fmpDate.replace(" ", "T")}Z` : `${fmpDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return { date: fmpDate.slice(0, 10), time: null };
  return { date: ET_DATE.format(d), time: hasTime ? ET_TIME.format(d) : null };
}

export async function fetchEconomicEvents(from: string, to: string): Promise<EconomicEvent[]> {
  const json = await fmpGet("economic-calendar", { from, to });
  if (!Array.isArray(json)) throw new Error(`Unexpected FMP economic-calendar response: ${JSON.stringify(json).slice(0, 300)}`);

  const grouped = new Map<string, EconomicEvent>();
  for (const e of json as Record<string, unknown>[]) {
    const name = typeof e.event === "string" ? e.event : "";
    const isUs = e.country === "US" || e.currency === "USD";
    const important = e.impact === "High" || KEY_RELEASE.test(name);
    if (!name || !isUs || !important || typeof e.date !== "string") continue;

    const { date, time } = toEt(e.date);
    const key = `${date} ${time ?? ""}`;
    const group = grouped.get(key) ?? { date, time, names: [] };
    if (!group.names.includes(name)) group.names.push(name);
    grouped.set(key, group);
  }

  return Array.from(grouped.values()).sort((a, b) =>
    `${a.date} ${a.time ?? ""}`.localeCompare(`${b.date} ${b.time ?? ""}`)
  );
}

export async function fetchWatchlistEarnings(from: string, to: string): Promise<EarningsEvent[]> {
  const json = await fmpGet("earnings-calendar", { from, to });
  if (!Array.isArray(json)) throw new Error(`Unexpected FMP earnings-calendar response: ${JSON.stringify(json).slice(0, 300)}`);

  const watch = new Set(EARNINGS_WATCHLIST);
  return (json as Record<string, unknown>[])
    .filter((e) => typeof e.symbol === "string" && watch.has(e.symbol) && typeof e.date === "string")
    .map((e) => ({
      symbol: e.symbol as string,
      date: (e.date as string).slice(0, 10),
      timing: typeof e.time === "string" && e.time ? e.time : null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
