"use client";

import { ItineraryStop, Leg } from "@/lib/types";
import { CATEGORY_EMOJI, CATEGORY_TINT, TRANSPORT_EMOJI } from "@/lib/theme";

function priceDots(level: 1 | 2 | 3 | 4) {
  return "$".repeat(level);
}

function PhotoPlaceholder({ stop }: { stop: ItineraryStop }) {
  const tint = CATEGORY_TINT[stop.category];
  const photos = stop.venue.photos ?? [];

  if (photos.length > 0) {
    return (
      <div className="relative h-40 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos[0]} alt={stop.venue.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      </div>
    );
  }

  return (
    <div
      className="relative h-40 w-full overflow-hidden flex items-end justify-between p-4"
      style={{ background: `linear-gradient(135deg, ${tint.from} 0%, ${tint.to} 100%)` }}
    >
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl opacity-25"
        aria-hidden
      >
        {CATEGORY_EMOJI[stop.category]}
      </div>
      <div className="absolute top-3 left-3 text-[10px] uppercase tracking-widest text-white/50">
        photo unavailable in demo
      </div>
    </div>
  );
}

function StatChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1 text-xs text-[color:var(--color-ink-muted)]">
      {children}
    </div>
  );
}

export default function StopCard({
  stop,
  stopIndex,
  totalStops,
  legFromPrev,
  onSwap,
  swapping,
}: {
  stop: ItineraryStop;
  stopIndex: number;
  totalStops: number;
  legFromPrev?: Leg;
  onSwap: () => void;
  swapping: boolean;
}) {
  const tint = CATEGORY_TINT[stop.category];

  return (
    <div className="relative">
      {/* Leg indicator above the card, except for the first stop */}
      {legFromPrev && (
        <div className="flex items-center gap-2 pl-6 pr-4 py-3 text-xs text-[color:var(--color-ink-dim)]">
          <span aria-hidden>{TRANSPORT_EMOJI[legFromPrev.mode]}</span>
          <span>
            {legFromPrev.durationMinutes} min · {legFromPrev.distanceMiles} mi
          </span>
          <span className="flex-1 h-px bg-[color:var(--color-border)]" />
        </div>
      )}

      <article className="warm-card rounded-2xl overflow-hidden">
        <PhotoPlaceholder stop={stop} />

        <div className="p-4 space-y-3">
          {/* Top row: category chip, position, start time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full uppercase tracking-wider"
                style={{ background: tint.chip, color: "var(--color-ink)" }}
              >
                <span aria-hidden>{CATEGORY_EMOJI[stop.category]}</span>
                Stop {stopIndex + 1} of {totalStops}
              </span>
            </div>
            <div className="text-xs font-mono text-[color:var(--color-accent)] tabular-nums">
              {stop.startLabel}
            </div>
          </div>

          {/* Name + neighborhood */}
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--color-ink)] leading-tight">
              {stop.venue.name}
            </h3>
            <div className="text-xs text-[color:var(--color-ink-muted)] mt-0.5">
              {stop.venue.neighborhood}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <StatChip>
              <span aria-hidden>★</span>
              <span className="text-[color:var(--color-gold)]">{stop.venue.rating.toFixed(1)}</span>
            </StatChip>
            <StatChip>
              <span className="text-[color:var(--color-ink-dim)]">{priceDots(stop.venue.priceLevel)}</span>
            </StatChip>
            <StatChip>
              <span aria-hidden>⏱</span>
              <span>~{stop.durationMinutes} min</span>
            </StatChip>
          </div>

          {/* Vibe tags */}
          {stop.enrichment.vibeTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {stop.enrichment.vibeTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-[color:var(--color-surface)] border border-[color:var(--color-border)] text-[color:var(--color-ink-muted)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Why we picked this */}
          <p className="text-sm text-[color:var(--color-ink-muted)] leading-relaxed">
            <span className="text-[color:var(--color-accent)] font-medium">Why this: </span>
            {stop.enrichment.whyPicked}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onSwap}
              disabled={swapping}
              className="flex-1 rounded-full py-2.5 text-sm font-medium border border-[color:var(--color-border-strong)] text-[color:var(--color-ink)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition disabled:opacity-60"
            >
              {swapping ? "Loading…" : "↻ Swap this stop"}
            </button>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                stop.venue.name + " " + stop.venue.address
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full py-2.5 px-4 text-sm font-medium border border-[color:var(--color-border)] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] hover:border-[color:var(--color-border-strong)] transition"
            >
              Directions ↗
            </a>
          </div>
        </div>
      </article>
    </div>
  );
}
