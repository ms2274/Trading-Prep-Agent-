import { StopCategory, Venue } from "./types";

// [low, high] per-person dollar estimate at each Google-style price level (1-4).
const PRICE_RANGES: Record<StopCategory, [number, number][]> = {
  coffee: [
    [6, 10],
    [8, 14],
    [12, 18],
    [16, 25],
  ],
  lunch: [
    [12, 18],
    [18, 28],
    [28, 45],
    [45, 70],
  ],
  dinner: [
    [20, 30],
    [30, 55],
    [55, 90],
    [90, 150],
  ],
  drinks: [
    [10, 15],
    [15, 25],
    [25, 40],
    [40, 65],
  ],
  activity: [
    [0, 15],
    [15, 30],
    [30, 50],
    [50, 90],
  ],
  dessert: [
    [5, 9],
    [8, 14],
    [12, 20],
    [18, 30],
  ],
};

export function costRangeFor(venue: Venue): [number, number] {
  return PRICE_RANGES[venue.category][venue.priceLevel - 1];
}

export function sumCostRanges(venues: Venue[]): { low: number; high: number } {
  let low = 0;
  let high = 0;
  for (const v of venues) {
    const [l, h] = costRangeFor(v);
    low += l;
    high += h;
  }
  return { low, high };
}
