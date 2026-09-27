import { NextResponse } from "next/server";
import { fetchVixQuote } from "@/lib/fmp";
import { getUpcomingMarketHolidays } from "@/lib/polygon";
import { buildPrepSheetInput } from "@/lib/buildPrepSheetInput";
import { generatePrepSheet } from "@/lib/claude";
import { upsertPrepSheet } from "@/lib/supabase";
import { saveLatestSheets, StoredSheet } from "@/lib/latestSheets";
import { SYMBOLS } from "@/lib/symbols";

export async function POST() {
  const vix = await fetchVixQuote().catch(() => null);
  const holidays = await getUpcomingMarketHolidays().catch(() => []);

  const settled = await Promise.allSettled(
    SYMBOLS.map(async (symbol): Promise<StoredSheet> => {
      const input = await buildPrepSheetInput(symbol, vix, holidays);
      const { output, raw } = await generatePrepSheet(input);

      // Storage is a nice-to-have (history), not a reason to hide a
      // successfully generated sheet from the user — never let a Supabase
      // problem (paused project, schema drift, network hiccup) masquerade
      // as a generation failure.
      try {
        await upsertPrepSheet({
          symbol,
          trade_date: input.date,
          levels: input,
          analysis: output,
          raw_claude_response: raw,
        });
      } catch (err) {
        console.error(`Failed to save ${symbol} prep sheet to Supabase:`, err);
      }

      return { input, output, generatedAt: new Date().toISOString() };
    })
  );

  const sheets: StoredSheet[] = [];
  const errors: { symbol: string; error: string }[] = [];

  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      sheets.push(result.value);
    } else {
      const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push({ symbol: SYMBOLS[i], error: message });
    }
  });

  try {
    await saveLatestSheets(sheets);
  } catch (err) {
    console.error("Failed to save latest sheets to disk:", err);
  }

  return NextResponse.json({ sheets, errors });
}
