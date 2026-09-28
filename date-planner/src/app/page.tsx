"use client";

import { useState } from "react";
import DateForm from "@/components/DateForm";
import RouteMap from "@/components/RouteMap";
import StopCard from "@/components/StopCard";
import SwapSheet from "@/components/SwapSheet";
import { applySwap } from "@/lib/itinerary";
import { FormInput, Itinerary, PlanSource, StopCategory, SwapAlternative } from "@/lib/types";

type ViewState =
  | { status: "form" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "results"; itinerary: Itinerary; source: PlanSource };

interface SwapState {
  stopIndex: number;
  category: StopCategory;
  alternatives: SwapAlternative[] | null; // null while fetching
}

export default function Home() {
  const [state, setState] = useState<ViewState>({ status: "form" });
  const [showMap, setShowMap] = useState(false);
  const [swap, setSwap] = useState<SwapState | null>(null);

  async function handleGenerate(input: FormInput) {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setState({ status: "results", itinerary: data.itinerary, source: data.source });
      setShowMap(false);
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong." });
    }
  }

  async function openSwap(stopIndex: number) {
    if (state.status !== "results") return;
    const category = state.itinerary.stops[stopIndex].category;
    setSwap({ stopIndex, category, alternatives: null });
    try {
      const res = await fetch("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary: state.itinerary, stopIndex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load alternatives.");
      setSwap({ stopIndex, category, alternatives: data.alternatives });
    } catch {
      setSwap({ stopIndex, category, alternatives: [] });
    }
  }

  function pickSwap(alt: SwapAlternative) {
    if (state.status !== "results" || !swap) return;
    const updated = applySwap(state.itinerary, swap.stopIndex, alt);
    setState({ ...state, itinerary: updated });
    setSwap(null);
  }

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-lg px-4 pt-8 pb-24 sm:pt-14">
        {state.status !== "results" && (
          <>
            <header className="mb-8">
              <div className="text-[11px] uppercase tracking-widest text-[color:var(--color-accent)] mb-2">
                Date Night · NYC
              </div>
              <h1 className="text-3xl sm:text-4xl font-semibold leading-tight text-[color:var(--color-ink)]">
                Plan the whole night <br className="hidden sm:block" />
                <span className="text-[color:var(--color-ink-muted)]">in about a minute.</span>
              </h1>
              <p className="mt-3 text-sm text-[color:var(--color-ink-muted)]">
                Tell it the vibe. It builds the itinerary, hands you rich cards for each stop, and lets you swap any one you don&apos;t love.
              </p>
            </header>

            <div className="warm-card rounded-3xl p-6">
              <DateForm onSubmit={handleGenerate} submitting={state.status === "loading"} />
            </div>

            {state.status === "error" && (
              <p className="mt-4 text-center text-sm text-[color:var(--color-rose)]">{state.message}</p>
            )}
          </>
        )}

        {state.status === "results" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setState({ status: "form" })}
                className="text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
              >
                ← Start over
              </button>
              <button
                onClick={() => setShowMap((v) => !v)}
                className="text-sm font-medium rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] hover:border-[color:var(--color-border-strong)] transition"
              >
                {showMap ? "Hide map" : "Show map"}
              </button>
            </div>

            <SummaryBar itinerary={state.itinerary} source={state.source} />

            {showMap && <RouteMap itinerary={state.itinerary} />}

            <div className="space-y-1">
              {state.itinerary.stops.map((stop, i) => (
                <StopCard
                  key={`${stop.venue.id}-${i}`}
                  stop={stop}
                  stopIndex={i}
                  totalStops={state.itinerary.stops.length}
                  legFromPrev={i > 0 ? state.itinerary.legs[i - 1] : undefined}
                  onSwap={() => openSwap(i)}
                  swapping={swap?.stopIndex === i && swap.alternatives === null}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <SwapSheet
        open={swap !== null}
        onClose={() => setSwap(null)}
        alternatives={swap?.alternatives ?? null}
        category={swap?.category ?? null}
        onPick={pickSwap}
      />
    </main>
  );
}

function SourceBadge({ source }: { source: PlanSource }) {
  const label =
    source === "live"
      ? "Live NYC venues"
      : source === "ai"
        ? "AI-written picks · sample venues"
        : "Demo mode · sample venues";
  return (
    <div className="text-[10px] uppercase tracking-widest text-[color:var(--color-ink-dim)] mb-2">
      {label}
    </div>
  );
}

function SummaryBar({ itinerary, source }: { itinerary: Itinerary; source: PlanSource }) {
  const t = itinerary.totals;
  const hours = (t.totalMinutes / 60).toFixed(1);

  return (
    <div className="warm-card rounded-2xl p-4">
      <SourceBadge source={source} />
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--color-ink)]">Your night out</h2>
          <div className="text-xs text-[color:var(--color-ink-muted)] mt-0.5">{itinerary.tagline}</div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-[color:var(--color-border)]">
        <SummaryStat label="cost" value={`$${t.estCostLow}–${t.estCostHigh}`} />
        <SummaryStat label="time" value={`${hours}h`} />
        <SummaryStat label="travel" value={`${t.travelMiles}mi`} />
        <SummaryStat label="rating" value={`${t.avgRating.toFixed(1)}★`} accent />
      </div>
    </div>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <div
        className={
          "text-sm font-semibold tabular-nums " +
          (accent ? "text-[color:var(--color-gold)]" : "text-[color:var(--color-ink)]")
        }
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-ink-dim)] mt-0.5">
        {label}
      </div>
    </div>
  );
}
