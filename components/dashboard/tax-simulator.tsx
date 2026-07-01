"use client";

import type { TaxSimulationResult } from "@/lib/types";
import { apiFetch, formatINR } from "@/lib/client/api";
import { useState } from "react";
import { ErrorBox, InputField, PanelShell, PrimaryButton } from "./shared";

export function TaxSimulatorPanel() {
  const [additional80C, setAdditional80C] = useState("30000");
  const [additional80D, setAdditional80D] = useState("0");
  const [homeLoanInterest, setHomeLoanInterest] = useState("0");
  const [result, setResult] = useState<TaxSimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runSimulation(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await apiFetch<{ simulation: TaxSimulationResult }>(
        "/api/tax/simulate",
        {
          method: "POST",
          body: JSON.stringify({
            additional80C: parseInt(additional80C, 10) || 0,
            additional80D: parseInt(additional80D, 10) || 0,
            homeLoanInterest: parseInt(homeLoanInterest, 10) || 0,
          }),
        }
      );
      setResult(data.simulation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PanelShell title="Tax-Saving Simulation">
      <p className="mb-4 text-sm text-slate-600">
        Estimate the impact of additional Section 80C, 80D, or home loan interest
        investments using simplified tax assumptions.
      </p>

      <form onSubmit={runSimulation} className="grid gap-4 sm:grid-cols-3">
        <InputField
          label="Additional 80C investment (₹)"
          type="number"
          min="0"
          value={additional80C}
          onChange={(e) => setAdditional80C(e.target.value)}
        />
        <InputField
          label="Additional 80D premium (₹)"
          type="number"
          min="0"
          value={additional80D}
          onChange={(e) => setAdditional80D(e.target.value)}
        />
        <InputField
          label="Additional home loan interest (₹)"
          type="number"
          min="0"
          value={homeLoanInterest}
          onChange={(e) => setHomeLoanInterest(e.target.value)}
        />
        <div className="sm:col-span-3">
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Calculating..." : "Run Simulation"}
          </PrimaryButton>
        </div>
      </form>

      {error && <div className="mt-4"><ErrorBox message={error} /></div>}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <ResultCard label="Current Est. Tax" value={formatINR(result.currentEstimatedTax)} />
            <ResultCard label="Projected Est. Tax" value={formatINR(result.projectedEstimatedTax)} />
            <ResultCard label="Estimated Savings" value={formatINR(result.estimatedSavings)} highlight />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Step-by-step breakdown</h3>
            <div className="space-y-2">
              {result.steps.map((step) => (
                <div key={step.label} className="rounded-lg border border-slate-100 px-4 py-3 text-sm">
                  <div className="flex justify-between font-medium text-slate-900">
                    <span>{step.label}</span>
                    <span>{formatINR(step.result)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{step.formula}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <p className="font-medium">Assumptions & limitations:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {result.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </PanelShell>
  );
}

function ResultCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl font-bold ${highlight ? "text-emerald-800" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}
