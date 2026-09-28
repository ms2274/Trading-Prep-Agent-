import { FormInput, StopCategory, StopEnrichment, Venue, Vibe } from "./types";

// Deterministic mock enrichment used when no Anthropic API key is set.
// Produces "why we picked this" copy + a small set of human vibe tags that
// vary by venue, category, vibe input, and price so the demo feels real.

const CATEGORY_ANCHOR: Record<StopCategory, string> = {
  coffee: "an easy, unhurried opener that gives you space to actually talk",
  lunch: "a low-stakes midday move — solid food without turning into a long sit-down",
  dinner: "your main event: a room that holds attention without shouting over you",
  drinks: "a cocktail moment that carries the mood without any awkward silences",
  activity: "the memorable, hands-on beat — you'll be talking about this one next week",
  dessert: "the last stop that turns a good night into one you both remember",
};

const VIBE_OPENER: Record<Vibe, string[]> = {
  romantic: ["Low lights, close tables,", "Candles, quiet booths,", "Intimate room,"],
  casual: ["Laid-back energy,", "No pressure at all,", "Easy in, easy out,"],
  adventurous: ["Something a little different —", "One for the story pile —", "Unexpected in the best way —"],
  foodie: ["The kitchen actually cooks —", "For people who read menus twice —", "Chef-driven and it shows —"],
  artsy: ["Visually interesting space,", "Feels curated, not decorated,", "Design people notice —"],
  chill: ["Slow tempo,", "No line, no rush,", "Quiet enough to hear each other,"],
};

const PRICE_TAIL: Record<1 | 2 | 3 | 4, string> = {
  1: "and it won't dent the night's budget.",
  2: "at a price that keeps things flexible.",
  3: "and it's worth the spend.",
  4: "— it's a splurge, but a considered one.",
};

const CATEGORY_TAGS: Record<StopCategory, string[]> = {
  coffee: ["quiet", "cozy", "walk-in friendly"],
  lunch: ["daytime", "shareable plates", "well-lit"],
  dinner: ["date-night classic", "conversation-friendly", "well-lit tables"],
  drinks: ["low-lit", "great cocktails", "close tables"],
  activity: ["memorable", "hands-on", "photo-worthy"],
  dessert: ["quick stop", "sweet finish", "walkable"],
};

const VIBE_TAGS: Record<Vibe, string[]> = {
  romantic: ["intimate", "candlelit", "close tables"],
  casual: ["low-key", "no dress code", "easy going"],
  adventurous: ["off the beaten path", "worth a story", "a little different"],
  foodie: ["chef-driven", "menu-worth-reading", "hidden gem"],
  artsy: ["design-forward", "curated space", "gallery-adjacent"],
  chill: ["mellow", "slow pace", "quiet enough to talk"],
};

const RATING_TAG = (rating: number): string | null => {
  if (rating >= 4.6) return "highly rated";
  if (rating >= 4.4) return "well-reviewed";
  return null;
};

const PRICE_TAG: Record<1 | 2 | 3 | 4, string> = {
  1: "budget-friendly",
  2: "mid-range",
  3: "upscale",
  4: "splurge",
};

function pickDeterministic<T>(seed: string, arr: T[]): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % arr.length;
  return arr[idx];
}

export function mockEnrichmentFor(venue: Venue, input: FormInput): StopEnrichment {
  const seed = venue.id + input.vibe;
  const opener = pickDeterministic(seed + "op", VIBE_OPENER[input.vibe]);
  const priceTail = PRICE_TAIL[venue.priceLevel];
  const anchor = CATEGORY_ANCHOR[venue.category];

  const whyPicked = `${opener} ${anchor} ${priceTail}`;

  const tagPool = new Set<string>();
  tagPool.add(pickDeterministic(seed + "c", CATEGORY_TAGS[venue.category]));
  tagPool.add(pickDeterministic(seed + "v", VIBE_TAGS[input.vibe]));
  const rt = RATING_TAG(venue.rating);
  if (rt) tagPool.add(rt);
  if (venue.priceLevel === 1 || venue.priceLevel === 4) tagPool.add(PRICE_TAG[venue.priceLevel]);

  return { whyPicked, vibeTags: Array.from(tagPool).slice(0, 3) };
}
