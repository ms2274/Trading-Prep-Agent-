import { getDirectionsProvider } from "./directions";
import { mockEnrichmentFor } from "./enrichment";
import { getPlacesProvider } from "./places";
import { formatClock, recomputeItineraryTotals } from "./timeline";
import {
  FormInput,
  Itinerary,
  ItineraryStop,
  Leg,
  StopCategory,
  SwapAlternative,
  Venue,
} from "./types";
import { CATEGORY_LABELS, TIME_OF_DAY_SEQUENCES } from "./vibeMappings";

const CANDIDATES_PER_CATEGORY = 6;

const STOP_DURATION_MINUTES: Record<StopCategory, number> = {
  coffee: 30,
  lunch: 45,
  dinner: 80,
  drinks: 50,
  activity: 65,
  dessert: 30,
};

const TIME_OF_DAY_START_HOUR: Record<FormInput["timeOfDay"], number> = {
  morning: 10,
  afternoon: 13,
  evening: 18,
  night: 20,
};

function categoriesFor(input: FormInput): StopCategory[] {
  return TIME_OF_DAY_SEQUENCES[input.timeOfDay].slice(0, input.stopCount);
}

async function fetchCandidates(input: FormInput, category: StopCategory): Promise<Venue[]> {
  const provider = getPlacesProvider();
  return provider.search({
    category,
    neighborhood: input.neighborhood,
    vibe: input.vibe,
    budget: input.budget,
    limit: CANDIDATES_PER_CATEGORY,
  });
}

async function computeLegs(venues: Venue[], input: FormInput): Promise<Leg[]> {
  const directions = getDirectionsProvider();
  const legs: Leg[] = [];
  for (let i = 0; i < venues.length - 1; i++) {
    const { distanceMiles, durationMinutes } = await directions.route(
      venues[i],
      venues[i + 1],
      input.transportMode
    );
    legs.push({
      fromVenueId: venues[i].id,
      toVenueId: venues[i + 1].id,
      distanceMiles,
      durationMinutes,
      mode: input.transportMode,
    });
  }
  return legs;
}

function buildStops(venues: Venue[], legs: Leg[], input: FormInput): ItineraryStop[] {
  let clock = TIME_OF_DAY_START_HOUR[input.timeOfDay] * 60;
  const stops: ItineraryStop[] = [];
  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    const durationMinutes = STOP_DURATION_MINUTES[venue.category];
    stops.push({
      venue,
      category: venue.category,
      enrichment: mockEnrichmentFor(venue, input),
      startLabel: formatClock(clock),
      durationMinutes,
    });
    clock += durationMinutes;
    if (i < legs.length) clock += legs[i].durationMinutes;
  }
  return stops;
}

export async function generatePrimaryItinerary(input: FormInput): Promise<Itinerary> {
  const categories = categoriesFor(input);

  const candidateLists = await Promise.all(categories.map((c) => fetchCandidates(input, c)));

  candidateLists.forEach((list, i) => {
    if (list.length === 0) {
      throw new Error(
        `No ${categories[i]} options found for these filters. Try "Anywhere in NYC" or a different vibe.`
      );
    }
  });

  // Primary plan = highest-scoring candidate for each slot. Provider already
  // sorted by rating + vibe match, so slot[0] is the pick.
  const primaryVenues = candidateLists.map((list) => list[0]);
  const legs = await computeLegs(primaryVenues, input);
  const stops = buildStops(primaryVenues, legs, input);
  const totals = recomputeItineraryTotals(stops, legs);

  const categoryLabel = categories.map((c) => CATEGORY_LABELS[c]).join(" → ");

  return {
    id: `plan-${Date.now()}`,
    title: "Your night out",
    tagline: categoryLabel,
    stops,
    legs,
    totals,
    meta: { input },
  };
}

export async function generateSwapAlternatives(
  itinerary: Itinerary,
  stopIndex: number
): Promise<SwapAlternative[]> {
  const input = itinerary.meta.input;
  const currentCategory = itinerary.stops[stopIndex].category;
  const excludedIds = new Set(itinerary.stops.map((s) => s.venue.id));

  const candidates = (await fetchCandidates(input, currentCategory)).filter(
    (v) => !excludedIds.has(v.id)
  );

  const picks = candidates.slice(0, 3);
  if (picks.length === 0) return [];

  const directions = getDirectionsProvider();
  const prevVenue = stopIndex > 0 ? itinerary.stops[stopIndex - 1].venue : null;
  const nextVenue =
    stopIndex < itinerary.stops.length - 1 ? itinerary.stops[stopIndex + 1].venue : null;

  return Promise.all(
    picks.map(async (venue): Promise<SwapAlternative> => {
      const legFromPrev = prevVenue
        ? {
            fromVenueId: prevVenue.id,
            toVenueId: venue.id,
            ...(await directions.route(prevVenue, venue, input.transportMode)),
            mode: input.transportMode,
          }
        : undefined;
      const legToNext = nextVenue
        ? {
            fromVenueId: venue.id,
            toVenueId: nextVenue.id,
            ...(await directions.route(venue, nextVenue, input.transportMode)),
            mode: input.transportMode,
          }
        : undefined;
      return {
        venue,
        enrichment: mockEnrichmentFor(venue, input),
        durationMinutes: STOP_DURATION_MINUTES[venue.category],
        legFromPrev,
        legToNext,
      };
    })
  );
}

export function applySwap(
  itinerary: Itinerary,
  stopIndex: number,
  alt: SwapAlternative
): Itinerary {
  const newStops = [...itinerary.stops];
  const newLegs = [...itinerary.legs];

  newStops[stopIndex] = {
    venue: alt.venue,
    category: alt.venue.category,
    enrichment: alt.enrichment,
    startLabel: newStops[stopIndex].startLabel, // placeholder, recomputed below
    durationMinutes: alt.durationMinutes,
  };

  if (alt.legFromPrev && stopIndex > 0) newLegs[stopIndex - 1] = alt.legFromPrev;
  if (alt.legToNext && stopIndex < newLegs.length) newLegs[stopIndex] = alt.legToNext;

  // Re-run start labels through the timeline.
  let clock = TIME_OF_DAY_START_HOUR[itinerary.meta.input.timeOfDay] * 60;
  const relabeled = newStops.map((s, i) => {
    const withLabel: ItineraryStop = { ...s, startLabel: formatClock(clock) };
    clock += s.durationMinutes;
    if (i < newLegs.length) clock += newLegs[i].durationMinutes;
    return withLabel;
  });

  const totals = recomputeItineraryTotals(relabeled, newLegs);

  return {
    ...itinerary,
    stops: relabeled,
    legs: newLegs,
    totals,
  };
}
