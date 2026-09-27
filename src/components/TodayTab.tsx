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

const PHASE_LABEL: Record<string, string> = {
  premarket: "Pre-market",
  regular: "Regular hours",
  afterhours: "After hours",
};

function SymbolCard({ sheet }: { sheet: StoredSheet }) {
  const { input, output, generatedAt } = sheet;
  const bars = input.recentDailyBars;
  const pc = input.priceContext;
  const change = pc.changeFromPrevClose;
  const changePct = pc.changeFromPrevClosePct;
  const up = (change ?? 0) >= 0;
  const priceTime = new Date(pc.lastPriceTime).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

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
            {changePct.toFixed(2)}%) <span className="font-normal text-slate-500">vs prior close</span>
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {PHASE_LABEL[pc.lastPricePhase]} · as of {priceTime} ET · ~15 min delayed
      </p>
      {pc.premarket && (
        <p className="mt-2 inline-flex gap-3 rounded-lg border border-amber-800/60 bg-amber-950/30 px-2.5 py-1 font-mono text-xs text-amber-200">
          <span className="font-sans text-amber-300">Pre-market</span>
          <span>H {fmt(pc.premarket.high)}</span>
          <span>L {fmt(pc.premarket.low)}</span>
        </p>
      )}
      <p className="mt-1 text-xs text-slate-500">
        Sheet generated {updated}
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

function dayLabel(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function timeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const TIMING_LABEL: Record<string, string> = { bmo: "before open", amc: "after close" };

function EventsCard({ sheet }: { sheet: StoredSheet }) {
  const { economic, earnings, errors } = sheet.input.events;
  const today = sheet.output.date;

  return (
    <Card title="Event Risk · next 10 days" icon={<AlertIcon className="h-5 w-5 text-amber-400" />}>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Economic releases (ET)</h4>
          {economic === null ? (
            <p className="text-sm text-amber-300">Couldn&apos;t load — check the calendar yourself today.</p>
          ) : economic.length === 0 ? (
            <p className="text-sm text-slate-500">No major US releases scheduled.</p>
          ) : (
            <ul className="space-y-2">
              {economic.map((e, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className={`w-40 shrink-0 ${e.date === today ? "font-semibold text-amber-300" : "text-slate-400"}`}>
                    {e.date === today ? "Today" : dayLabel(e.date)}
                    {e.time && ` ${timeLabel(e.time)}`}
                  </span>
                  <span className="text-slate-200">{e.names.slice(0, 3).join(" · ")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Mega-cap earnings</h4>
          {earnings === null ? (
            <p className="text-sm text-amber-300">Couldn&apos;t load — check the calendar yourself today.</p>
          ) : earnings.length === 0 ? (
            <p className="text-sm text-slate-500">None of the index heavyweights report in this window.</p>
          ) : (
            <ul className="space-y-2">
              {earnings.map((e, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className={`w-40 shrink-0 ${e.date === today ? "font-semibold text-amber-300" : "text-slate-400"}`}>
                    {e.date === today ? "Today" : dayLabel(e.date)}
                  </span>
                  <span className="font-semibold text-slate-100">{e.symbol}</span>
                  {e.timing && <span className="text-slate-500">{TIMING_LABEL[e.timing] ?? e.timing}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {errors.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-slate-500">Why some data is missing</summary>
          <ul className="mt-1 space-y-1 text-xs text-slate-500">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </details>
      )}
    </Card>
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

      {sheets[0] && <EventsCard sheet={sheets[0]} />}

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
