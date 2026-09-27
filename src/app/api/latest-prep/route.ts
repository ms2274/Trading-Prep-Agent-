import { NextResponse } from "next/server";
import { readLatestSheets } from "@/lib/latestSheets";
import { SYMBOLS } from "@/lib/symbols";

// Without this, Next.js would cache this GET at build time and always serve
// whatever sheet existed when the app was built.
export const dynamic = "force-dynamic";

export async function GET() {
  const { sheets, failures } = await readLatestSheets(SYMBOLS);
  return NextResponse.json({ sheets, errors: failures });
}
