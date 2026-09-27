import { NextResponse } from "next/server";
import { readHistory } from "@/lib/history";
import { fetchAggregateBars, filterRegularSession } from "@/lib/polygon";
import { evaluateEntry, gradeStats, zoneStats, PlayResult, ZoneResult } from "@/lib/scorecard";

export const dynamic = "force-dynamic";

// Only the last ~6 weeks are scored, keeping each Polygon request small.
const LOOKBACK_DAYS = 45;

export async function GET() {
  const now = Date.now();
  const cutoff = now - LOOKBACK_DAYS * 86_400_000;
  const entries = (await readHistory()).filter((e) => new Date(e.generatedAt).getTime() >= cutoff);

  const plays: PlayResult[] = [];
  const zones: ZoneResult[] = [];
  const errors: string[] = [];

  const symbols = Array.from(new Set(entries.map((e) => e.symbol)));
  await Promise.all(
    symbols.map(async (symbol) => {
      const own = entries.filter((e) => e.symbol === symbol);
      const from = new Date(Math.min(...own.map((e) => new Date(e.generatedAt).getTime())) - 86_400_000);
      try {
        const bars = filterRegularSession(await fetchAggregateBars(symbol, 5, "minute", from, new Date(now)));
        for (const entry of own) {
          const result = evaluateEntry(entry, bars, now);
          plays.push(...result.plays);
          zones.push(...result.zones);
        }
      } catch (err) {
        errors.push(`${symbol}: ${err instanceof Error ? err.message : String(err)}`);
      }
    })
  );

  plays.sort((a, b) => b.date.localeCompare(a.date) || a.symbol.localeCompare(b.symbol));

  return NextResponse.json({
    days: new Set(entries.map((e) => e.date)).size,
    stats: gradeStats(plays),
    zoneStats: zoneStats(zones.filter((z) => z.final)),
    plays,
    errors,
  });
}
