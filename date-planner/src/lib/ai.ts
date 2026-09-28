import Anthropic from "@anthropic-ai/sdk";
import { mockEnrichmentFor } from "./enrichment";
import { FormInput, StopEnrichment, Venue } from "./types";

// Server-side only. `process.env.ANTHROPIC_API_KEY` never reaches the client.
// If the key is missing, or any part of the AI path fails, we silently fall
// back to the deterministic mock enrichment so the user always gets a plan.

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

const MODEL = "claude-opus-5";
const MAX_OUTPUT_TOKENS = 2000;

// Stable system prompt (kept identical across calls so it caches).
const SYSTEM_PROMPT = `You write short "why this" blurbs for date-night venues in NYC.

Rules:
- One sentence per venue, max 22 words, warm but not gushy.
- No exclamation marks. No emoji.
- Do not repeat the venue's name in the blurb.
- Do not start every blurb the same way.
- Vibe tags: 2 to 3 tags per venue, each 1 to 3 lowercase words. Concrete over abstract: "close tables", "quiet room", "hidden gem", "worth a story", "great cocktails" — not "amazing", "vibrant".
- Never invent facts the input doesn't support (no fake dishes, chefs, or awards).

Return ONLY valid JSON matching this shape, no prose, no code fences:
{"venues": [{"id": "<venue-id>", "whyPicked": "<sentence>", "vibeTags": ["<tag>", "<tag>"]}]}`;

interface AIVenueRow {
  id: string;
  whyPicked: string;
  vibeTags: string[];
}

function extractFirstJsonObject(text: string): string | null {
  // Some models wrap JSON in code fences even when asked not to. Strip them
  // and find the first balanced { ... } block.
  const withoutFences = text.replace(/```(?:json)?\s*/g, "").replace(/```/g, "");
  const start = withoutFences.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < withoutFences.length; i++) {
    const c = withoutFences[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return withoutFences.slice(start, i + 1);
    }
  }
  return null;
}

function buildUserPrompt(input: FormInput, venues: Venue[]): string {
  const compactVenues = venues.map((v) => ({
    id: v.id,
    name: v.name,
    category: v.category,
    neighborhood: v.neighborhood,
    priceLevel: v.priceLevel,
    rating: v.rating,
    baseVibeTags: v.vibeTags,
  }));

  return `A couple is planning a ${input.vibe} date, ${input.timeOfDay}, budget ${"$".repeat(
    input.budget
  )}, in ${input.neighborhood}. They're getting around by ${input.transportMode}.

For each venue below, write a one-sentence blurb explaining why it fits their date (max 22 words), and pick 2–3 short vibe tags.

Venues:
${JSON.stringify(compactVenues, null, 2)}

Return JSON only, no other text.`;
}

/**
 * Enrich a batch of venues with AI-written blurbs and vibe tags.
 * Returns a Map keyed by venue.id. Venues missing from the AI response, or
 * this whole call failing, fall back to mockEnrichmentFor(venue, input).
 */
export async function enrichVenuesWithAI(
  input: FormInput,
  venues: Venue[]
): Promise<Map<string, StopEnrichment>> {
  const result = new Map<string, StopEnrichment>();
  if (venues.length === 0) return result;

  if (!hasAnthropicKey()) {
    for (const v of venues) result.set(v.id, mockEnrichmentFor(v, input));
    return result;
  }

  try {
    const client = getClient();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: buildUserPrompt(input, venues) }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const rawText = textBlock && "text" in textBlock ? textBlock.text : "";
    const jsonSlice = extractFirstJsonObject(rawText);
    if (!jsonSlice) throw new Error("no JSON in response");

    const parsed = JSON.parse(jsonSlice) as { venues?: AIVenueRow[] };
    const rows = Array.isArray(parsed.venues) ? parsed.venues : [];

    for (const row of rows) {
      if (
        typeof row.id === "string" &&
        typeof row.whyPicked === "string" &&
        Array.isArray(row.vibeTags) &&
        row.vibeTags.every((t) => typeof t === "string")
      ) {
        result.set(row.id, {
          whyPicked: row.whyPicked.trim(),
          vibeTags: row.vibeTags.map((t) => t.trim()).slice(0, 3),
        });
      }
    }
  } catch (err) {
    // Log server-side; user still gets a plan via mock fallback below.
    console.warn("[ai] enrichment failed, falling back to mock:", err);
  }

  // Fill any gaps with mock enrichment so every venue has a blurb.
  for (const v of venues) {
    if (!result.has(v.id)) result.set(v.id, mockEnrichmentFor(v, input));
  }
  return result;
}
