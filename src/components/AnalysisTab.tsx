"use client";

import { useState } from "react";
import type { StoredSheet } from "@/lib/latestSheets";
import type { SupplyDemandZoneDetail, TrendTierInput } from "@/lib/claude";
import { Card, StrengthBadge, TrendTag, fmt } from "./ui";

function TrendRow({ label, tier }: { label: string; tier: TrendTierInput }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div>
        <div className="text-sm font-medium text-slate-100">{label}</div>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{tier.rationale}</p>
      </div>
      <TrendTag classification={tier.classification} />
    </div>
  );
}

function ZoneList({ zones, tone }: { zones: SupplyDemandZoneDetail[]; tone: "supply" | "demand" }) {
  if (zones.length === 0) return <p className="text-sm text-slate-500">None identified.</p>;
  return (
    <ul className="space-y-3">
      {zones.map((z, i) => (
        <li key={i}>
          <div className="flex items-center gap-2">
            <span className={`font-mono text-sm ${tone === "supply" ? "text-rose-300" : "text-emerald-300"}`}>
              {fmt(z.low)} – {fmt(z.high)}
            </span>
            <StrengthBadge strength={z.strength} />
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{z.rationale}</p>
        </li>
      ))}
    </ul>
  );
}

const VIX_REGIME_LABEL: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  elevated: "Elevated",
  high: "High",
};

function SymbolAnalysis({ sheet }: { sheet: StoredSheet }) {
  const { input, output } = sheet;
  const { today, prevDay } = input.sessionLevels;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card title="Trend">
        <p className="text-sm leading-relaxed text-slate-300">{output.trendSummary}</p>
        <div className="mt-2 divide-y divide-slate-800">
          <TrendRow label="Primary (monthly)" tier={input.trend.primary} />
          <TrendRow label="Secondary (weekly)" tier={input.trend.secondary} />
          <TrendRow label="Minor (daily)" tier={input.trend.minor} />
        </div>
      </Card>

      <Card title="Supply & Demand Zones">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-400">Supply</h4>
            <ZoneList zones={output.supplyZones} tone="supply" />
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">Demand</h4>
            <ZoneList zones={output.demandZones} tone="demand" />
          </div>
        </div>
      </Card>

      <Card title="Support & Resistance Ladder">
        <p className="-mt-1 mb-3 text-xs text-slate-500">From daily swing points, nearest to current price first.</p>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-rose-400">Resistance</h4>
            {input.srLadder.resistance.length === 0 && <p className="text-slate-500">None above</p>}
            {input.srLadder.resistance.map((r) => (
              <div key={r.label} className="flex justify-between py-0.5 font-mono text-rose-300">
                <span className="text-slate-500">{r.label}</span>
                <span>{fmt(r.price)}</span>
              </div>
            ))}
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-400">Support</h4>
            {input.srLadder.support.length === 0 && <p className="text-slate-500">None below</p>}
            {input.srLadder.support.map((s) => (
              <div key={s.label} className="flex justify-between py-0.5 font-mono text-emerald-300">
                <span className="text-slate-500">{s.label}</span>
                <span>{fmt(s.price)}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Volume Profile">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="pb-1 text-left font-normal">Timeframe</th>
              <th className="pb-1 text-left font-normal">POC</th>
              <th className="pb-1 text-left font-normal">VAH</th>
              <th className="pb-1 text-left font-normal">VAL</th>
            </tr>
          </thead>
          <tbody className="font-mono text-slate-200">
            {input.timeframes.map((tf) => (
              <tr key={tf.label} className="border-t border-slate-800">
                <td className="py-1.5 text-slate-400">{tf.label}</td>
                <td className="py-1.5">{fmt(tf.poc)}</td>
                <td className="py-1.5">{fmt(tf.vah)}</td>
                <td className="py-1.5">{fmt(tf.val)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h4 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Low-volume zones</h4>
        <div className="space-y-1 text-xs">
          {input.timeframes.map((tf) => (
            <p key={tf.label} className="text-slate-400">
              <span className="mr-2 font-mono text-slate-500">{tf.label}</span>
              {tf.lvnZones.length === 0 ? (
                <span className="text-slate-600">none</span>
              ) : (
                <span className="font-mono text-slate-300">
                  {tf.lvnZones.map((z) => `${fmt(z.low)}–${fmt(z.high)}`).join(", ")}
                </span>
              )}
            </p>
          ))}
        </div>
      </Card>

      <Card title="Session Levels">
        <p className="-mt-1 mb-3 text-xs text-slate-500">Regular hours only (9:30–4:00 ET).</p>
        {!today && !prevDay ? (
          <p className="text-sm text-slate-500">No session data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="pb-1 text-left font-normal">Session</th>
                <th className="pb-1 text-left font-normal">Open</th>
                <th className="pb-1 text-left font-normal">High</th>
                <th className="pb-1 text-left font-normal">Low</th>
                <th className="pb-1 text-left font-normal">Close</th>
              </tr>
            </thead>
            <tbody className="font-mono text-slate-200">
              {[
                { label: "Today", s: today },
                { label: "Prior day", s: prevDay },
              ].map(
                ({ label, s }) =>
                  s && (
                    <tr key={label} className="border-t border-slate-800">
                      <td className="py-1.5 font-sans text-slate-400">
                        {label} <span className="text-xs text-slate-600">{s.date}</span>
                      </td>
                      <td className="py-1.5">{fmt(s.open)}</td>
                      <td className="py-1.5">{fmt(s.hod)}</td>
                      <td className="py-1.5">{fmt(s.lod)}</td>
                      <td className="py-1.5">{fmt(s.close)}</td>
                    </tr>
                  )
              )}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="VIX">
        {input.vix ? (
          <div className="mb-2 flex items-baseline gap-3">
            <span className="text-2xl font-bold">{fmt(input.vix.price)}</span>
            <span className={`text-sm ${input.vix.changePercent >= 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {input.vix.changePercent >= 0 ? "+" : ""}
              {input.vix.changePercent.toFixed(2)}%
            </span>
            <span className="rounded-md border border-slate-600 bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
              {VIX_REGIME_LABEL[input.vix.regime] ?? input.vix.regime} regime
            </span>
          </div>
        ) : (
          <p className="mb-2 text-sm text-amber-300">VIX unavailable this refresh.</p>
        )}
        <p className="text-sm leading-relaxed text-slate-300">{output.vixSummary}</p>
      </Card>
    </div>
  );
}

export function AnalysisTab({ sheets }: { sheets: StoredSheet[] }) {
  const [symbol, setSymbol] = useState(sheets[0]?.output.symbol);
  const sheet = sheets.find((s) => s.output.symbol === symbol) ?? sheets[0];

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900/60 p-1">
        {sheets.map((s) => (
          <button
            key={s.output.symbol}
            onClick={() => setSymbol(s.output.symbol)}
            className={`rounded-lg px-5 py-1.5 text-sm font-semibold transition ${
              s.output.symbol === sheet.output.symbol ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {s.output.symbol}
          </button>
        ))}
      </div>
      <SymbolAnalysis sheet={sheet} />
    </div>
  );
}
