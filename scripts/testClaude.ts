import { config } from "dotenv";
config({ path: ".env.local" });

import { fetchSharedContext } from "../src/lib/sharedContext";
import { buildPrepSheetInput } from "../src/lib/buildPrepSheetInput";
import { generatePrepSheet } from "../src/lib/claude";

const SYMBOL = "SPY";

async function main() {
  console.log(`Building prep sheet input for ${SYMBOL}...\n`);

  const shared = await fetchSharedContext();
  if (!shared.vix) console.error("VIX unavailable, continuing without it.");
  shared.events.errors.forEach((e) => console.error(e));

  const input = await buildPrepSheetInput(SYMBOL, shared);

  console.log("=== Input sent to Claude ===");
  console.log(JSON.stringify(input, null, 2));

  console.log("\n=== Calling Claude ===");
  try {
    const { output } = await generatePrepSheet(input);
    console.log("\n=== Parsed prep sheet ===");
    console.log(JSON.stringify(output, null, 2));
  } catch (err) {
    console.error("\nClaude prep sheet generation failed:");
    console.error(err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
