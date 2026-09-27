import { NextResponse } from "next/server";
import { fetchSharedContext } from "@/lib/sharedContext";
import { buildPrepSheetInput } from "@/lib/buildPrepSheetInput";
import { generatePrepSheet } from "@/lib/claude";
import { upsertPrepSheet } from "@/lib/supabase";
import { saveLatestSheets, StoredSheet } from "@/lib/latestSheets";
import { appendHistory } from "@/lib/history";
import { SYMBOLS } from "@/lib/symbols";

export async function POST() {
  const shared = await fetchSharedContext();

  const settled = await Promise.allSettled(
    SYMBOLS.map(async (symbol): Promise<StoredSheet> => {
      const input = await buildPrepSheetInput(symbol, shared);
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

  // History first: on its very first run it seeds from the previous latest
  // sheets, which saveLatestSheets is about to overwrite.
  try {
    await appendHistory(sheets);
  } catch (err) {
    console.error("Failed to append scorecard history:", err);
  }
  try {
    await saveLatestSheets(sheets);
  } catch (err) {
    console.error("Failed to save latest sheets to disk:", err);
  }

  return NextResponse.json({ sheets, errors });
}
