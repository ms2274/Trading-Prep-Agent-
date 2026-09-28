"use client";

import { useEffect } from "react";
import { CATEGORY_EMOJI, CATEGORY_TINT } from "@/lib/theme";
import { SwapAlternative } from "@/lib/types";

function priceDots(level: 1 | 2 | 3 | 4) {
  return "$".repeat(level);
}

export default function SwapSheet({
  open,
  onClose,
  alternatives,
  category,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  alternatives: SwapAlternative[] | null;
  category: string | null;
  onPick: (alt: SwapAlternative) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const tint = category ? CATEGORY_TINT[category as keyof typeof CATEGORY_TINT] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="relative w-full sm:max-w-md warm-card rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-[color:var(--color-ink-dim)]">
              Swap this stop
            </div>
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">
              {category && tint && (
                <span className="mr-2" aria-hidden>
                  {CATEGORY_EMOJI[category as keyof typeof CATEGORY_EMOJI]}
                </span>
              )}
              Other {category ? category : "options"} nearby
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full h-9 w-9 flex items-center justify-center text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface)] transition"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3">
          {alternatives === null ? (
            <div className="py-10 text-center text-sm text-[color:var(--color-ink-dim)]">Loading alternatives…</div>
          ) : alternatives.length === 0 ? (
            <div className="py-10 text-center text-sm text-[color:var(--color-ink-dim)]">
              No other options match. Try adjusting your filters.
            </div>
          ) : (
            alternatives.map((alt) => (
              <button
                key={alt.venue.id}
                onClick={() => onPick(alt)}
                className="w-full text-left rounded-2xl bg-[color:var(--color-surface)] border border-[color:var(--color-border)] p-4 hover:border-[color:var(--color-accent)] transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[color:var(--color-ink)] truncate">{alt.venue.name}</h3>
                    <div className="text-xs text-[color:var(--color-ink-muted)] mt-0.5">
                      {alt.venue.neighborhood}
                    </div>
                  </div>
                  <div className="text-xs text-[color:var(--color-ink-muted)] whitespace-nowrap">
                    <span className="text-[color:var(--color-gold)]">★ {alt.venue.rating.toFixed(1)}</span>
                    <span className="mx-1 text-[color:var(--color-ink-dim)]">·</span>
                    <span>{priceDots(alt.venue.priceLevel)}</span>
                  </div>
                </div>

                {alt.enrichment.vibeTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {alt.enrichment.vibeTags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 border border-[color:var(--color-border)] text-[color:var(--color-ink-muted)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-[color:var(--color-ink-muted)] mt-2 leading-relaxed line-clamp-2">
                  {alt.enrichment.whyPicked}
                </p>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] text-[color:var(--color-ink-dim)]">
                    {alt.legFromPrev
                      ? `${alt.legFromPrev.durationMinutes} min from previous stop`
                      : "First stop"}
                  </span>
                  <span className="text-xs font-medium text-[color:var(--color-accent)] group-hover:translate-x-0.5 transition-transform">
                    Use this →
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
