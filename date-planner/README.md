# Date Planner (NYC)

Tell it the vibe, get a complete NYC date-night itinerary — one plan, rich
place cards for each stop, and one-tap swap on any stop you don't love.
Travel times, cost estimates, and start times all recompute automatically
as you swap. See [`docs/vision.md`](docs/vision.md) for the full product
direction.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Modes

The app runs end-to-end out of the box against a bundled sample dataset of
~90 fictional NYC venues — no keys required. Copy `.env.example` to
`.env.local` and fill in whichever keys you have to unlock the layers:

| Env var | What it enables |
|---|---|
| `ANTHROPIC_API_KEY` | Claude writes the "why we picked this" blurbs and vibe tags for each stop instead of the deterministic mock generator. Server-side only. |
| `GOOGLE_PLACES_API_KEY` | Venue search and travel times use live Google Places (New) + Distance Matrix instead of the sample dataset. Server-side only. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | The map toggle on the results screen renders a live Google Map. Exposed to the browser — restrict it to your domain. |

Each layer is independent and falls back gracefully if its key is unset —
you can turn on AI blurbs without going live on Places, for example.

## How it works

- `src/app/page.tsx` — single-page flow: form → itinerary results → per-stop swap.
- `src/lib/itinerary.ts` — builds the primary itinerary (highest-rated pick per
  stop, plus travel legs and timeline) and generates alternatives for a swap.
- `src/lib/places.ts`, `src/lib/directions.ts` — pluggable data providers
  (mock ↔ Google), auto-selected based on env.
- `src/lib/ai.ts` — Anthropic client that enriches a batch of venues with
  blurbs + vibe tags in one call; silently falls back to
  `src/lib/enrichment.ts` (deterministic mock) on any error.
- `src/lib/pricing.ts`, `src/lib/timeline.ts` — shared cost + start-time math
  used by both initial generation and swap.
- `src/components/StopCard.tsx`, `SwapSheet.tsx`, `RouteMap.tsx`,
  `DateForm.tsx` — UI.
