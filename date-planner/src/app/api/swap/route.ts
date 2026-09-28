import { NextRequest, NextResponse } from "next/server";
import { generateSwapAlternatives } from "@/lib/itinerary";
import { isLiveMode } from "@/lib/places";
import { SwapRequest, SwapResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SwapRequest;

  try {
    const alternatives = await generateSwapAlternatives(body.itinerary, body.stopIndex);
    const response: SwapResponse = {
      stopIndex: body.stopIndex,
      alternatives,
      source: isLiveMode() ? "live" : "mock",
    };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load alternatives.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
