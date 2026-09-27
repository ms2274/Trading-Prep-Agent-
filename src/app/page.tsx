"use client";

import { useEffect, useState } from "react";
import type { StoredSheet as Sheet } from "@/lib/latestSheets";
import { SYMBOLS } from "@/lib/symbols";
import { getMarketStatus, MarketStatus } from "@/lib/marketStatus";
import { ET_DATE } from "@/components/ui";
import { TodayTab } from "@/components/TodayTab";
import { AnalysisTab } from "@/components/AnalysisTab";
import { CalculatorTab } from "@/components/CalculatorTab";
import { AnalysisIcon, CalculatorIcon, HomeIcon, LogoIcon, RefreshIcon } from "@/components/icons";

type Tab = "today" | "analysis" | "calculator";

const TABS: { id: Tab; label: string; Icon: typeof HomeIcon }[] = [
  { id: "today", label: "Today", Icon: HomeIcon },
  { id: "analysis", label: "Analysis", Icon: AnalysisIcon },
  { id: "calculator", label: "Calculator", Icon: CalculatorIcon },
];

const STATUS_STYLE: Record<MarketStatus, { label: string; dot: string }> = {
  open: { label: "Market Open", dot: "bg-emerald-400" },
  premarket: { label: "Pre-market", dot: "bg-amber-400" },
  afterhours: { label: "After Hours", dot: "bg-amber-400" },
  closed: { label: "Market Closed", dot: "bg-slate-500" },
};

interface SymbolError {
  symbol: string;
  error: string;
}

// Replace sheets for symbols that just regenerated; keep the previous sheet
// for any symbol that failed, so one failure doesn't blank its panel.
function mergeSheets(previous: Sheet[], fresh: Sheet[]): Sheet[] {
  const bySymbol = new Map(previous.map((s) => [s.output.symbol, s]));
  for (const s of fresh) bySymbol.set(s.output.symbol, s);
  return SYMBOLS.flatMap((symbol) => {
    const sheet = bySymbol.get(symbol);
    return sheet ? [sheet] : [];
  });
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("today");
  const [sheets, setSheets] = useState<Sheet[] | null>(null);
  const [symbolErrors, setSymbolErrors] = useState<SymbolError[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/latest-prep")
      .then((res) => res.json())
      .then((json) => setSheets((current) => current ?? json.sheets ?? []))
      .catch((err) => setError(`Couldn't load the last saved prep sheet: ${err instanceof Error ? err.message : String(err)}`));
  }, []);

  // Set on the client only (the page is prerendered), refreshed each minute
  // so the market-status pill stays current while the app sits open.
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  async function refreshPrep() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/refresh-prep", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
      setSheets((current) => mergeSheets(current ?? [], json.sheets));
      setSymbolErrors(json.errors ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const todayEt = now ? ET_DATE.format(now) : null;
  const holidays = sheets?.[0]?.input.upcomingHolidays ?? [];
  const status = now && todayEt ? STATUS_STYLE[getMarketStatus(now, todayEt, holidays)] : null;

  return (
    <div className="flex min-h-screen">
      <nav className="sticky top-0 flex h-screen w-24 shrink-0 flex-col items-center gap-2 border-r border-slate-800/80 bg-[#0a1122] py-6">
        <LogoIcon className="mb-6 h-8 w-8 text-slate-200" />
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex w-20 flex-col items-center gap-1 rounded-xl py-3 text-xs font-medium transition ${
              tab === id ? "bg-indigo-600/90 text-white" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
          >
            <Icon className="h-6 w-6" />
            {label}
          </button>
        ))}
      </nav>

      <main className="min-w-0 flex-1 px-8 py-6">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Trading Prep</h1>
              <p className="mt-1 text-sm text-slate-400">
                Discretionary prep aid — confirm everything against live order flow before acting.
              </p>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-right">
                {now && (
                  <div className="text-sm font-medium text-slate-200">
                    {now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                  </div>
                )}
                {status && (
                  <div className="mt-0.5 flex items-center justify-end gap-2 text-sm text-slate-400">
                    {status.label}
                    <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`} />
                  </div>
                )}
              </div>
              <button
                onClick={refreshPrep}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                <RefreshIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Refreshing… ~1 min" : "Refresh Prep"}
              </button>
            </div>
          </header>

          {error && (
            <p className="mt-5 rounded-xl border border-rose-800 bg-rose-950/60 p-3 text-sm text-rose-200">{error}</p>
          )}
          {symbolErrors.map((e) => (
            <p key={e.symbol} className="mt-5 rounded-xl border border-rose-800 bg-rose-950/60 p-3 text-sm text-rose-200">
              {e.symbol} failed to generate: {e.error}
            </p>
          ))}

          <div className="mt-6">
            {tab === "calculator" ? (
              <CalculatorTab />
            ) : sheets === null ? (
              <p className="text-sm text-slate-500">Loading your last prep sheet…</p>
            ) : sheets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center">
                <p className="text-lg font-semibold text-slate-200">No prep sheet yet</p>
                <p className="mt-1 text-sm text-slate-400">
                  Click Refresh Prep to generate today&apos;s SPY and QQQ sheets (takes about a minute).
                </p>
              </div>
            ) : tab === "today" ? (
              <TodayTab sheets={sheets} />
            ) : (
              <AnalysisTab sheets={sheets} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
