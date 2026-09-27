"use client";

import { useMemo, useState } from "react";
import { Card } from "./ui";

const TARGET_MULTIPLES = [2, 3, 4, 5];

export function CalculatorTab() {
  const [riskAmount, setRiskAmount] = useState("35");
  const [entryPrice, setEntryPrice] = useState("1.20");
  const [stopPrice, setStopPrice] = useState("0.90");

  const result = useMemo(() => {
    const risk = parseFloat(riskAmount);
    const entry = parseFloat(entryPrice);
    const stop = parseFloat(stopPrice);

    if (!Number.isFinite(risk) || !Number.isFinite(entry) || !Number.isFinite(stop)) {
      return { error: "Enter valid numbers for all fields." } as const;
    }
    if (stop >= entry) {
      return { error: "Stop premium must be below entry premium." } as const;
    }

    const riskPerContract = (entry - stop) * 100;
    const contracts = Math.floor(risk / riskPerContract);
    const actualRisk = contracts * riskPerContract;
    const targets = TARGET_MULTIPLES.map((multiple) => {
      const targetPrice = entry + multiple * (entry - stop);
      return { multiple, targetPrice, profit: contracts * (targetPrice - entry) * 100 };
    });

    return { contracts, riskPerContract, actualRisk, targets };
  }, [riskAmount, entryPrice, stopPrice]);

  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
      <Card title="Position Size">
        <p className="-mt-1 mb-4 text-xs text-slate-500">Option premiums per share, as quoted on the chain.</p>
        <div className="grid gap-4">
          <Field label="Max risk for this trade ($)" value={riskAmount} onChange={setRiskAmount} />
          <Field label="Entry premium ($/share)" value={entryPrice} onChange={setEntryPrice} />
          <Field label="Stop premium ($/share)" value={stopPrice} onChange={setStopPrice} />
        </div>
      </Card>

      <Card title="Result">
        {"error" in result ? (
          <p className="text-sm text-rose-400">{result.error}</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Contracts" value={String(result.contracts)} highlight />
              <Stat label="Risk / contract" value={`$${result.riskPerContract.toFixed(2)}`} />
              <Stat label="Actual risk" value={`$${result.actualRisk.toFixed(2)}`} />
            </div>
            {result.contracts === 0 && (
              <p className="mt-3 text-sm text-amber-300">Max risk is too small for 1 contract at this stop distance.</p>
            )}
            <h4 className="mb-1 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Targets</h4>
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="pb-1 text-left font-normal">Multiple</th>
                  <th className="pb-1 text-left font-normal">Premium</th>
                  <th className="pb-1 text-left font-normal">Profit</th>
                </tr>
              </thead>
              <tbody className="font-mono text-slate-200">
                {result.targets.map((t) => (
                  <tr key={t.multiple} className="border-t border-slate-800">
                    <td className="py-1.5 text-slate-400">{t.multiple}x</td>
                    <td className="py-1.5">${t.targetPrice.toFixed(2)}</td>
                    <td className="py-1.5 text-emerald-300">${t.profit.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className={`mt-1 font-mono text-lg ${highlight ? "text-indigo-300" : "text-slate-100"}`}>{value}</div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-400">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-slate-100 outline-none focus:border-indigo-500"
      />
    </label>
  );
}
