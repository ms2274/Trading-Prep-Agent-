import { NextRequest, NextResponse } from "next/server";
import { hasAnthropicKey } from "@/lib/ai";
import { generateSwapAlternatives } from "@/lib/itinerary";
import { isLiveMode } from "@/lib/places";
import { PlanResponse, SwapRequest, SwapResponse } from "@/lib/types";

function sourceLabel(): PlanResponse["source"] {
  if (isLiveMode()) return "live";
  if (hasAnthropicKey()) return "ai";
  return "mock";
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SwapRequest;

  try {
    const alternatives = await generateSwapAlternatives(body.itinerary, body.stopIndex);
    const response: SwapResponse = {
      stopIndex: body.stopIndex,
      alternatives,
      source: sourceLabel(),
    };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load alternatives.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
