import type { StoredSheet } from "@/lib/latestSheets";
import type { OptionsPlay } from "@/lib/claude";
import { Card, ET_DATE, GradeBadge, SYMBOL_NAMES, fmt } from "./ui";
import { AlertIcon, CheckIcon, SparkIcon, TargetIcon } from "./icons";

function Sparkline({ closes, up }: { closes: number[]; up: boolean }) {
  if (closes.length < 2) return null;
  const w = 140;
  const h = 44;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const points = closes
    .map((c, i) => `${((i / (closes.length - 1)) * w).toFixed(1)},${(h - ((c - min) / span) * h).toFixed(1)}`)
    .join(" ");
  return (
    <div className="flex flex-col items-end">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        <polyline points={points} fill="none" stroke={up ? "#34d399" : "#fb7185"} strokeWidth={2} strokeLinejoin="round" />
      </svg>
      <span className="mt-0.5 text-[10px] text-slate-500">{closes.length}-day closes</span>
    </div>
  );
}

function LevelCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 px-3 first:pl-0 last:pr-0">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 truncate font-mono text-base text-slate-100">{value}</div>
    </div>
  );
}

function SymbolCard({ sheet }: { sheet: StoredSheet }) {
  const { input, output, generatedAt } = sheet;
  const bars = input.recentDailyBars;
  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  const change = last && prev ? last.c - prev.c : null;
  const changePct = change !== null && prev ? (change / prev.c) * 100 : null;
  const up = (change ?? 0) >= 0;

  const oneMin = input.timeframes.find((t) => t.label === "1m");
  const support = input.srLadder.support[0];
  const resistance = input.srLadder.resistance[0];

  const isFromToday = output.date === ET_DATE.format(new Date());
  const updated = new Date(generatedAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });

  const accent = up ? "border-emerald-700/70 from-emerald-950/40" : "border-rose-700/70 from-rose-950/40";
  const innerBorder = up ? "border-emerald-800/60" : "border-rose-800/60";

  return (
    <section className={`rounded-2xl border bg-gradient-to-b to-slate-900/60 p-5 ${accent}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{output.symbol}</h2>
          <p className="text-sm text-slate-400">{SYMBOL_NAMES[output.symbol] ?? ""}</p>
        </div>
        <Sparkline closes={bars.map((b) => b.c)} up={up} />
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-bold">${fmt(input.currentPrice)}</span>
        {change !== null && changePct !== null && (
          <span className={`text-sm font-medium ${up ? "text-emerald-400" : "text-rose-400"}`}>
            {up ? "▲" : "▼"} {up ? "+" : ""}
            {fmt(change)} ({up ? "+" : ""}
            {changePct.toFixed(2)}%)
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Updated {updated}
        {!isFromToday && (
          <span className="ml-2 rounded-md border border-amber-800 bg-amber-950 px-1.5 py-0.5 text-amber-300">
            Not from today — refresh
          </span>
        )}
      </p>

      <div className={`mt-4 rounded-xl border bg-slate-950/40 p-4 ${innerBorder}`}>
        <h3 className={`flex items-center gap-2 text-sm font-semibold ${up ? "text-emerald-300" : "text-rose-300"}`}>
          <SparkIcon className="h-4 w-4" />
          Key Takeaways
        </h3>
        {output.redFlags.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Nothing unusual flagged for today.</p>
        ) : (
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-200">
            {output.redFlags.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <h3 className="text-sm font-semibold text-slate-200">Key Levels</h3>
        <div className="mt-2 flex divide-x divide-slate-800">
          <LevelCell label="Support (S1)" value={support ? fmt(support.price) : "—"} />
          <LevelCell
            label="Value area (1m)"
            value={oneMin && oneMin.poc > 0 ? `${fmt(oneMin.val)} – ${fmt(oneMin.vah)}` : "—"}
          />
          <LevelCell label="Resistance (R1)" value={resistance ? fmt(resistance.price) : "—"} />
        </div>
      </div>
    </section>
  );
}

// "Breakout continuation: price clears..." → bold label + description.
function splitLabel(text: string): { label: string | null; body: string } {
  const idx = text.indexOf(":");
  if (idx > 0 && idx <= 48) return { label: text.slice(0, idx), body: text.slice(idx + 1).trim() };
  return { label: null, body: text };
}

function PlanItem({ icon, label, body }: { icon: React.ReactNode; label: string | null; body: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p className="text-sm leading-relaxed text-slate-300">
        {label && <span className="font-semibold text-slate-100">{label}: </span>}
        {body}
      </p>
    </li>
  );
}

function GamePlanCard({ sheet }: { sheet: StoredSheet }) {
  const { gamePlan, symbol } = sheet.output;
  return (
    <Card title={`Game Plan · ${symbol}`} icon={<TargetIcon className="h-5 w-5 text-indigo-400" />}>
      <ul className="space-y-4">
        <PlanItem icon={<TargetIcon className="h-5 w-5 text-indigo-400" />} label="Bias" body={gamePlan.primaryBias} />
        {gamePlan.scenarios.map((s, i) => {
          const { label, body } = splitLabel(s);
          return <PlanItem key={i} icon={<CheckIcon className="h-5 w-5 text-emerald-400" />} label={label} body={body} />;
        })}
        <PlanItem icon={<AlertIcon className="h-5 w-5 text-amber-400" />} label="Avoid" body={gamePlan.avoid} />
      </ul>
    </Card>
  );
}

function PlayCard({ symbol, play }: { symbol: string; play: OptionsPlay }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-slate-100">
          {symbol} – {play.title}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <GradeBadge grade={play.grade} />
          <span className="font-mono text-xs text-slate-300">{play.riskRewardRatio.toFixed(1)}:1</span>
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-400">
        <span className={play.direction === "long" ? "text-emerald-400" : "text-rose-400"}>
          {play.direction === "long" ? "Long (calls)" : "Short (puts)"}
        </span>
        {" · "}
        {play.strikeGuidance} · {play.dteRange}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-sm">
        <div>
          <div className="text-[11px] text-slate-500">Entry</div>
          <div className="text-slate-100">{fmt(play.entryTrigger)}</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-500">Stop</div>
          <div className="text-rose-300">{fmt(play.stopPrice)}</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-500">Target</div>
          <div className="text-emerald-300">{fmt(play.targetPrice)}</div>
        </div>
      </div>
      <details className="group mt-2">
        <summary className="cursor-pointer list-none text-xs text-indigo-300 hover:text-indigo-200">
          <span className="group-open:hidden">Why this play ▸</span>
          <span className="hidden group-open:inline">Hide ▾</span>
        </summary>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">{play.rationale}</p>
      </details>
    </div>
  );
}

export function TodayTab({ sheets }: { sheets: StoredSheet[] }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        {sheets.map((s) => (
          <SymbolCard key={s.output.symbol} sheet={s} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {sheets.map((s) => (
          <GamePlanCard key={s.output.symbol} sheet={s} />
        ))}
      </div>

      <Card title="Options Plays" icon={<SparkIcon className="h-5 w-5 text-indigo-400" />}>
        <p className="-mt-1 mb-3 text-xs text-slate-500">
          Candidates only — each cleared a 3:1 reward:risk check on the underlying. Confirm against live order flow.
        </p>
        <div className="grid gap-4 xl:grid-cols-2">
          {sheets.map((s) => (
            <div key={s.output.symbol} className="space-y-3">
              {s.output.optionsPlays.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-800 p-4 text-sm text-slate-500">
                  No {s.output.symbol} plays cleared 3:1 reward:risk today.
                </p>
              ) : (
                s.output.optionsPlays.map((p, i) => <PlayCard key={i} symbol={s.output.symbol} play={p} />)
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
