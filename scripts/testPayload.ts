// Prints the computed input for each symbol (no Claude call, no storage) so
// the data layer can be checked by eye: levels, price context, event calendars.
import { config } from "dotenv";
config({ path: ".env.local" });

import { fetchSharedContext } from "../src/lib/sharedContext";
import { buildPrepSheetInput } from "../src/lib/buildPrepSheetInput";
import { SYMBOLS } from "../src/lib/symbols";

const f = (n: number) => n.toFixed(2);

async function main() {
  const shared = await fetchSharedContext();

  console.log("=== Shared context ===");
  console.log(shared.vix ? `VIX ${f(shared.vix.price)} (${f(shared.vix.changePercent)}%)` : "VIX unavailable");
  console.log(`Holidays returned: ${shared.holidays.length}`);
  shared.events.errors.forEach((e) => console.log(`! ${e}`));

  console.log("\nEconomic events (times should be ET — CPI/jobs report = 08:30, FOMC = 14:00):");
  if (shared.events.economic === null) console.log("  (unavailable)");
  else if (shared.events.economic.length === 0) console.log("  none in window");
  else shared.events.economic.forEach((e) => console.log(`  ${e.date} ${e.time ?? "--:--"}  ${e.names.join(" | ")}`));

  console.log("\nWatchlist earnings:");
  if (shared.events.earnings === null) console.log("  (unavailable)");
  else if (shared.events.earnings.length === 0) console.log("  none in window");
  else shared.events.earnings.forEach((e) => console.log(`  ${e.date} ${e.symbol} ${e.timing ?? ""}`));

  for (const symbol of SYMBOLS) {
    console.log(`\n=== ${symbol} ===`);
    try {
      const input = await buildPrepSheetInput(symbol, shared);
      const pc = input.priceContext;
      console.log(
        `Last ${f(pc.lastPrice)} (${pc.lastPricePhase}, ${pc.lastPriceTime}) | prev close ${pc.prevClose !== null ? f(pc.prevClose) : "n/a"} | ` +
          `change ${pc.changeFromPrevClose ?? "n/a"} (${pc.changeFromPrevClosePct ?? "n/a"}%)`
      );
      console.log(pc.premarket ? `Pre-market H ${f(pc.premarket.high)} L ${f(pc.premarket.low)} vol ${pc.premarket.volume}` : "No pre-market bars today");

      for (const tf of input.timeframes) {
        const zones = tf.lvnZones.map((z) => `${f(z.low)}-${f(z.high)}`).join(", ") || "none";
        console.log(`${tf.label.padEnd(4)} POC ${f(tf.poc)} VAH ${f(tf.vah)} VAL ${f(tf.val)} | LVN ${zones}`);
      }

      const { primary, secondary, minor } = input.trend;
      console.log(`Trend: primary ${primary.classification}, secondary ${secondary.classification}, minor ${minor.classification}`);
      console.log(`Resistance: ${input.srLadder.resistance.map((r) => `${r.label}=${f(r.price)}`).join(", ") || "none"}`);
      console.log(`Support:    ${input.srLadder.support.map((s) => `${s.label}=${f(s.price)}`).join(", ") || "none"}`);

      for (const [label, s] of Object.entries(input.sessionLevels)) {
        if (s) console.log(`Session ${label} ${s.date}: O ${f(s.open)} H ${f(s.hod)} L ${f(s.lod)} C ${f(s.close)}`);
      }
    } catch (err) {
      console.error(`Failed for ${symbol}:`, err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
