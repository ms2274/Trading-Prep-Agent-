"use client";

import { useState } from "react";
import { FormInput, NEIGHBORHOODS, VIBES } from "@/lib/types";

const BUDGET_OPTIONS: { value: 1 | 2 | 3 | 4; label: string }[] = [
  { value: 1, label: "$" },
  { value: 2, label: "$$" },
  { value: 3, label: "$$$" },
  { value: 4, label: "$$$$" },
];

const STOP_COUNT_OPTIONS: { value: 2 | 3 | 4; label: string }[] = [
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
];

const TIME_OF_DAY_OPTIONS: { value: FormInput["timeOfDay"]; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
];

const TRANSPORT_OPTIONS: { value: FormInput["transportMode"]; label: string; emoji: string }[] = [
  { value: "walking", label: "Walk", emoji: "🚶" },
  { value: "transit", label: "Subway", emoji: "🚇" },
  { value: "driving", label: "Drive", emoji: "🚗" },
];

const DEFAULT_INPUT: FormInput = {
  neighborhood: "Anywhere in NYC",
  vibe: "romantic",
  budget: 2,
  stopCount: 3,
  timeOfDay: "evening",
  transportMode: "walking",
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-dim)] mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function pillClass(active: boolean) {
  return [
    "rounded-full px-3 py-2 text-sm font-medium transition-all",
    "border",
    active
      ? "bg-[color:var(--color-accent)] text-[#1a0f04] border-[color:var(--color-accent)] shadow-[0_6px_20px_-8px_rgba(247,161,60,0.7)]"
      : "bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)] border-[color:var(--color-border)] hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-ink)]",
  ].join(" ");
}

export default function DateForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (input: FormInput) => void;
  submitting: boolean;
}) {
  const [input, setInput] = useState<FormInput>(DEFAULT_INPUT);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(input);
      }}
      className="space-y-6"
    >
      <Section label="Vibe">
        <div className="flex flex-wrap gap-2">
          {VIBES.map((v) => (
            <button
              type="button"
              key={v.value}
              onClick={() => setInput({ ...input, vibe: v.value })}
              className={pillClass(input.vibe === v.value)}
            >
              <span className="mr-1">{v.emoji}</span>
              {v.label}
            </button>
          ))}
        </div>
      </Section>

      <Section label="Neighborhood">
        <div className="relative">
          <select
            value={input.neighborhood}
            onChange={(e) =>
              setInput({ ...input, neighborhood: e.target.value as FormInput["neighborhood"] })
            }
            className="w-full appearance-none rounded-xl bg-[color:var(--color-surface)] border border-[color:var(--color-border)] px-4 py-3 text-sm text-[color:var(--color-ink)] pr-9 focus:outline-none focus:border-[color:var(--color-accent)]"
          >
            {NEIGHBORHOODS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-dim)]"
          >
            ▾
          </span>
        </div>
      </Section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Section label="Budget">
          <div className="grid grid-cols-4 gap-1.5">
            {BUDGET_OPTIONS.map((b) => (
              <button
                type="button"
                key={b.value}
                onClick={() => setInput({ ...input, budget: b.value })}
                className={pillClass(input.budget === b.value) + " px-1"}
              >
                {b.label}
              </button>
            ))}
          </div>
        </Section>

        <Section label="Stops">
          <div className="grid grid-cols-3 gap-1.5">
            {STOP_COUNT_OPTIONS.map((s) => (
              <button
                type="button"
                key={s.value}
                onClick={() => setInput({ ...input, stopCount: s.value })}
                className={pillClass(input.stopCount === s.value) + " px-1"}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Section>
      </div>

      <Section label="When">
        <div className="flex flex-wrap gap-1.5">
          {TIME_OF_DAY_OPTIONS.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => setInput({ ...input, timeOfDay: t.value })}
              className={pillClass(input.timeOfDay === t.value) + " flex-1 min-w-[70px]"}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section label="Getting around">
        <div className="flex gap-1.5">
          {TRANSPORT_OPTIONS.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => setInput({ ...input, transportMode: t.value })}
              className={pillClass(input.transportMode === t.value) + " flex-1"}
            >
              <span className="mr-1">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full py-4 text-base font-semibold text-[#160a02] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background:
            "linear-gradient(135deg, var(--color-gold), var(--color-accent), var(--color-rose))",
          boxShadow: "0 12px 40px -12px rgba(247, 161, 60, 0.5)",
        }}
      >
        {submitting ? "Building your night…" : "Build my night out"}
      </button>
    </form>
  );
}
