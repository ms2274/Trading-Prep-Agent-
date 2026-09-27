export function fmt(n: number): string {
  return n.toFixed(2);
}

export const SYMBOL_NAMES: Record<string, string> = {
  SPY: "S&P 500 ETF",
  QQQ: "Nasdaq 100 ETF",
};

export const ET_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function Card({
  title,
  icon,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}>
      {title && (
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
          {icon}
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

const TREND_STYLE: Record<string, { label: string; className: string }> = {
  uptrend: { label: "Bullish", className: "border-emerald-700 bg-emerald-950 text-emerald-300" },
  downtrend: { label: "Bearish", className: "border-rose-700 bg-rose-950 text-rose-300" },
  sideways: { label: "Sideways", className: "border-slate-600 bg-slate-800 text-slate-300" },
};

export function TrendTag({ classification }: { classification: string }) {
  const style = TREND_STYLE[classification] ?? TREND_STYLE.sideways;
  return (
    <span className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}

const GRADE_STYLE: Record<string, string> = {
  A: "border-emerald-700 bg-emerald-950 text-emerald-300",
  B: "border-indigo-700 bg-indigo-950 text-indigo-300",
  C: "border-slate-600 bg-slate-800 text-slate-300",
};

export function GradeBadge({ grade }: { grade: string }) {
  return (
    <span className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${GRADE_STYLE[grade] ?? GRADE_STYLE.C}`}>
      Grade {grade}
    </span>
  );
}

export function StrengthBadge({ strength }: { strength: string }) {
  const strong = strength === "strong";
  return (
    <span
      className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${
        strong ? "border-amber-700 bg-amber-950 text-amber-300" : "border-slate-600 bg-slate-800 text-slate-400"
      }`}
    >
      {strong ? "Strong" : "Moderate"}
    </span>
  );
}
