import { sumCostRanges } from "./pricing";
import { Itinerary, ItineraryStop, Leg, TimeOfDay } from "./types";

const TIME_OF_DAY_START_HOUR: Record<TimeOfDay, number> = {
  morning: 10,
  afternoon: 13,
  evening: 18,
  night: 20,
};

export function formatClock(totalMinutesFromMidnight: number): string {
  const hour24 = Math.floor(totalMinutesFromMidnight / 60) % 24;
  const minute = totalMinutesFromMidnight % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
}

export function recomputeStartLabels(
  stops: Omit<ItineraryStop, "startLabel">[],
  legs: Leg[],
  timeOfDay: TimeOfDay
): ItineraryStop[] {
  let clock = TIME_OF_DAY_START_HOUR[timeOfDay] * 60;
  return stops.map((stop, i) => {
    const withLabel: ItineraryStop = { ...stop, startLabel: formatClock(clock) };
    clock += stop.durationMinutes;
    if (i < legs.length) clock += legs[i].durationMinutes;
    return withLabel;
  });
}

export function recomputeItineraryTotals(stops: ItineraryStop[], legs: Leg[]): Itinerary["totals"] {
  const travelMinutes = legs.reduce((s, l) => s + l.durationMinutes, 0);
  const travelMiles = Math.round(legs.reduce((s, l) => s + l.distanceMiles, 0) * 100) / 100;
  const stopMinutes = stops.reduce((s, x) => s + x.durationMinutes, 0);
  const avgRating =
    stops.length === 0
      ? 0
      : Math.round((stops.reduce((s, x) => s + x.venue.rating, 0) / stops.length) * 10) / 10;
  const { low, high } = sumCostRanges(stops.map((s) => s.venue));
  return {
    estCostLow: low,
    estCostHigh: high,
    totalMinutes: stopMinutes + travelMinutes,
    travelMinutes,
    travelMiles,
    avgRating,
  };
}
