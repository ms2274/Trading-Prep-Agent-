import { fetchEconomicEvents, fetchVixQuote, fetchWatchlistEarnings, EconomicEvent, EarningsEvent, VixQuote } from "./fmp";
import { getUpcomingMarketHolidays, easternDateString, MarketHoliday } from "./polygon";

// Covers the 7-10 DTE holding window of any play generated today.
const EVENT_WINDOW_DAYS = 10;

export interface EventCalendar {
  economic: EconomicEvent[] | null; // null = couldn't be loaded (see errors)
  earnings: EarningsEvent[] | null;
  errors: string[];
}

export interface SharedContext {
  vix: VixQuote | null;
  holidays: MarketHoliday[];
  events: EventCalendar;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// Everything that's the same for every symbol, fetched once per refresh.
// Each source degrades independently: a failure leaves that piece empty/null
// and records why, rather than failing the whole refresh.
export async function fetchSharedContext(): Promise<SharedContext> {
  const from = easternDateString(Date.now());
  const to = easternDateString(Date.now() + EVENT_WINDOW_DAYS * 86_400_000);

  const [vix, holidays, economic, earnings] = await Promise.allSettled([
    fetchVixQuote(),
    getUpcomingMarketHolidays(),
    fetchEconomicEvents(from, to),
    fetchWatchlistEarnings(from, to),
  ]);

  const errors: string[] = [];
  if (economic.status === "rejected") errors.push(`Economic calendar unavailable: ${errorMessage(economic.reason)}`);
  if (earnings.status === "rejected") errors.push(`Earnings calendar unavailable: ${errorMessage(earnings.reason)}`);

  return {
    vix: vix.status === "fulfilled" ? vix.value : null,
    holidays: holidays.status === "fulfilled" ? holidays.value : [],
    events: {
      economic: economic.status === "fulfilled" ? economic.value : null,
      earnings: earnings.status === "fulfilled" ? earnings.value : null,
      errors,
    },
  };
}
