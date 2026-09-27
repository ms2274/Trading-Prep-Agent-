"use client";

import { useEffect, useState } from "react";
import type { GradeStats, PlayOutcome, PlayResult } from "@/lib/scorecard";
import { Card, GradeBadge, StrengthBadge, fmt } from "./ui";

interface ScorecardData {
  days: number;
  stats: GradeStats[];
  zoneStats: { strength: string; total: number; held: number; broken: number; untested: number }[];
  plays: PlayResult[];
  errors: string[];
}

const OUTCOME_STYLE: Record<PlayOutcome, { label: string; className: string }> = {
  target: { label: "Hit target", className: "border-emerald-700 bg-emerald-950 text-emerald-300" },
  stop: { label: "Stopped out", className: "border-rose-700 bg-rose-950 text-rose-300" },
  live: { label: "Triggered · open", className: "border-indigo-700 bg-indigo-950 text-indigo-300" },
  waiting: { label: "Not triggered yet", className: "border-slate-600 bg-slate-800 text-slate-300" },
  not_triggered: { label: "Never triggered", className: "border-slate-700 bg-slate-900 text-slate-500" },
  no_result: { label: "No result in 5 days", className: "border-amber-800 bg-amber-950 text-amber-300" },
};

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);
const rFmt = (n: number | null) => (n === null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}R`);

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-100">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function ScorecardTab() {
  const [data, setData] = useState<ScorecardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/scorecard")
      .then((res) => res.json())
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  if (error) return <p className="text-sm text-rose-300">Couldn&apos;t load the scorecard: {error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Scoring past plays against price data…</p>;

  const all = data.stats[0];
  const byGrade = data.stats.slice(1);

  return (
    <div className="space-y-6">
      <details className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
        <summary className="cursor-pointer text-slate-300">How plays are scored</summary>
        <p className="mt-2 leading-relaxed">
          Each play is checked against 5-minute regular-hours bars for the 5 sessions after its sheet was generated.
          It&apos;s <b>triggered</b> when price reaches the entry. After that, whichever of stop or target is hit first
          decides it. If both land in the same 5-minute bar, or the stop is hit in the bar that triggered it, it counts
          as a stop (the conservative reading). Wins score +reward:risk, stops −1R. Zones: <b>held</b> if price
          touched them without a session closing through, <b>broken</b> if a session closed through. This measures
          the plan&apos;s levels on the underlying, not option P&amp;L.
        </p>
      </details>

      {data.errors.length > 0 && (
        <p className="rounded-xl border border-amber-800 bg-amber-950/50 p-3 text-sm text-amber-200">
          Some price data couldn&apos;t be loaded: {data.errors.join("; ")}
        </p>
      )}

      {all.total === 0 && data.errors.length > 0 ? null : all.total === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center">
          <p className="text-lg font-semibold text-slate-200">No plays tracked yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Every Refresh Prep adds that day&apos;s plays here, and each one is scored over the following 5 sessions.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Plays tracked" value={String(all.total)} sub={`over ${data.days} prep day${data.days === 1 ? "" : "s"}`} />
            <Stat label="Triggered" value={String(all.triggered)} sub={`${pct(all.total ? all.triggered / all.total : null)} of plays`} />
            <Stat label="Win rate" value={pct(all.winRate)} sub={`${all.wins} targets · ${all.losses} stops`} />
            <Stat label="Average result" value={rFmt(all.avgR)} sub="per resolved play" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="By grade">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="pb-1 text-left font-normal">Grade</th>
                    <th className="pb-1 text-left font-normal">Plays</th>
                    <th className="pb-1 text-left font-normal">Triggered</th>
                    <th className="pb-1 text-left font-normal">Win rate</th>
                    <th className="pb-1 text-left font-normal">Avg</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {byGrade.map((g) => (
                    <tr key={g.grade} className="border-t border-slate-800">
                      <td className="py-2">
                        <GradeBadge grade={g.grade} />
                      </td>
                      <td className="py-2 font-mono">{g.total}</td>
                      <td className="py-2 font-mono">{g.triggered}</td>
                      <td className="py-2 font-mono">
                        {pct(g.winRate)} <span className="text-xs text-slate-500">({g.wins}/{g.wins + g.losses})</span>
                      </td>
                      <td className={`py-2 font-mono ${(g.avgR ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{rFmt(g.avgR)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-slate-500">
                Small samples swing a lot — give it a few weeks before reading much into the grades.
              </p>
            </Card>

            <Card title="Zones (finished windows)">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="pb-1 text-left font-normal">Strength</th>
                    <th className="pb-1 text-left font-normal">Held</th>
                    <th className="pb-1 text-left font-normal">Broken</th>
                    <th className="pb-1 text-left font-normal">Untested</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-slate-200">
                  {data.zoneStats.map((z) => (
                    <tr key={z.strength} className="border-t border-slate-800">
                      <td className="py-2 font-sans">
                        <StrengthBadge strength={z.strength} />
                      </td>
                      <td className="py-2 text-emerald-300">{z.held}</td>
                      <td className="py-2 text-rose-300">{z.broken}</td>
                      <td className="py-2 text-slate-500">{z.untested}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <Card title="Recent plays">
            <div className="divide-y divide-slate-800">
              {data.plays.map((r, i) => {
                const style = OUTCOME_STYLE[r.outcome];
                return (
                  <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
                    <span className="w-24 text-slate-500">{r.date}</span>
                    <span className="min-w-[14rem] flex-1 font-medium text-slate-100">
                      {r.symbol} – {r.play.title}
                    </span>
                    <GradeBadge grade={r.play.grade} />
                    <span className="w-56 font-mono text-xs text-slate-400">
                      {r.play.direction === "long" ? "L" : "S"} {fmt(r.play.entryTrigger)} / {fmt(r.play.stopPrice)} / {fmt(r.play.targetPrice)}
                    </span>
                    <span className={`w-40 rounded-md border px-2 py-0.5 text-center text-xs font-medium ${style.className}`}>{style.label}</span>
                    <span className={`w-16 text-right font-mono ${r.r === null ? "text-slate-600" : r.r >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {rFmt(r.r)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
