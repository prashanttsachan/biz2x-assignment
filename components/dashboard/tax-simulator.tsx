"use client";

import type { TaxSimulationResult } from "@/lib/types";
import { apiFetch, formatINR } from "@/lib/client/api";
import { formatSlabLabel } from "@/lib/tax/calculator";
import { useEffect, useState } from "react";
import { ErrorBox, InputField, PanelShell, PrimaryButton } from "./shared";

const PRESETS = [
  { label: "Max 80C", values: { additional80C: "30000", additional80D: "0", additionalNps: "0", homeLoanInterest: "0" } },
  { label: "Add 80D", values: { additional80C: "0", additional80D: "10000", additionalNps: "0", homeLoanInterest: "0" } },
  { label: "NPS 80CCD(1B)", values: { additional80C: "0", additional80D: "0", additionalNps: "50000", homeLoanInterest: "0" } },
  { label: "Full package", values: { additional80C: "30000", additional80D: "10000", additionalNps: "25000", homeLoanInterest: "0" } },
];

export function TaxSimulatorPanel() {
  const [regime, setRegime] = useState<"old" | "new">("old");
  const [additional80C, setAdditional80C] = useState("30000");
  const [additional80D, setAdditional80D] = useState("0");
  const [additionalNps, setAdditionalNps] = useState("0");
  const [homeLoanInterest, setHomeLoanInterest] = useState("0");
  const [baseline, setBaseline] = useState<TaxSimulationResult | null>(null);
  const [result, setResult] = useState<TaxSimulationResult | null>(null);
  const [loadingBaseline, setLoadingBaseline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      setLoadingBaseline(true);
      try {
        const data = await apiFetch<{ simulation: TaxSimulationResult }>(
          "/api/tax/simulate"
        );
        setBaseline(data.simulation);
      } catch {
        setBaseline(null);
      } finally {
        setLoadingBaseline(false);
      }
    }

    void init();
  }, []);

  function applyPreset(values: (typeof PRESETS)[0]["values"]) {
    setAdditional80C(values.additional80C);
    setAdditional80D(values.additional80D);
    setAdditionalNps(values.additionalNps);
    setHomeLoanInterest(values.homeLoanInterest);
  }

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
            regime,
            additional80C: parseInt(additional80C, 10) || 0,
            additional80D: parseInt(additional80D, 10) || 0,
            additionalNps: parseInt(additionalNps, 10) || 0,
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

  const display = result ?? baseline;

  return (
    <PanelShell title="Tax-Saving Simulation">
      <p className="mb-4 text-sm text-slate-600">
        Explore old vs new regime tax, your declared investments, HRA exemption,
        and the impact of additional 80C, 80D, NPS (80CCD 1B), or home loan interest.
      </p>

      {loadingBaseline && (
        <p className="mb-4 text-sm text-slate-500">Loading your tax baseline…</p>
      )}

      {baseline?.declaration && (
        <DeclarationCard declaration={baseline.declaration} />
      )}

      {baseline?.regimeComparison && (
        <RegimeComparisonCard comparison={baseline.regimeComparison} />
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="self-center text-xs font-medium text-slate-600">Quick scenarios:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset.values)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <form onSubmit={runSimulation} className="space-y-4">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="regime"
              checked={regime === "old"}
              onChange={() => setRegime("old")}
            />
            Old regime (80C/80D/HRA)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="regime"
              checked={regime === "new"}
              onChange={() => setRegime("new")}
            />
            New regime
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InputField
            label="Additional 80C (₹)"
            type="number"
            min="0"
            value={additional80C}
            onChange={(e) => setAdditional80C(e.target.value)}
            hint={baseline?.declaration ? `Remaining: ${formatINR(baseline.declaration.section80C.remaining)}` : undefined}
          />
          <InputField
            label="Additional 80D (₹)"
            type="number"
            min="0"
            value={additional80D}
            onChange={(e) => setAdditional80D(e.target.value)}
            hint={baseline?.declaration ? `Remaining: ${formatINR(baseline.declaration.section80D.remaining)}` : undefined}
          />
          <InputField
            label="Additional NPS 80CCD(1B) (₹)"
            type="number"
            min="0"
            value={additionalNps}
            onChange={(e) => setAdditionalNps(e.target.value)}
          />
          <InputField
            label="Additional home loan interest (₹)"
            type="number"
            min="0"
            value={homeLoanInterest}
            onChange={(e) => setHomeLoanInterest(e.target.value)}
            hint={baseline?.declaration ? `Remaining: ${formatINR(baseline.declaration.homeLoanInterest.remaining)}` : undefined}
          />
        </div>

        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Calculating…" : "Run Simulation"}
        </PrimaryButton>
      </form>

      {error && (
        <div className="mt-4">
          <ErrorBox message={error} />
        </div>
      )}

      {display && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <ResultCard
              label="Current Est. Tax"
              value={formatINR(display.currentEstimatedTax)}
            />
            <ResultCard
              label={result ? "Projected Est. Tax" : "Taxable Income"}
              value={formatINR(
                result ? display.projectedEstimatedTax : display.currentTaxableIncome
              )}
            />
            <ResultCard
              label={result ? "Estimated Savings" : "Annual Gross"}
              value={formatINR(
                result ? display.estimatedSavings : display.annualGross
              )}
              highlight={!!result && display.estimatedSavings > 0}
            />
          </div>

          {display.recommendations.length > 0 && (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
              <p className="text-sm font-medium text-indigo-900">Recommendations</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-indigo-800">
                {display.recommendations.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {display.slabBreakdown.length > 0 && (
            <SlabBreakdownTable
              title={`Tax slab breakdown (${display.regime} regime — current)`}
              slabs={display.slabBreakdown}
            />
          )}

          {result && result.projectedSlabBreakdown.length > 0 && (
            <SlabBreakdownTable
              title="Tax slab breakdown (projected)"
              slabs={result.projectedSlabBreakdown}
            />
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Step-by-step breakdown
            </h3>
            <div className="space-y-2">
              {display.steps.map((step) => (
                <div
                  key={step.label}
                  className="rounded-lg border border-slate-100 px-4 py-3 text-sm"
                >
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
            <p className="font-medium">Assumptions & limitations</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {display.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </PanelShell>
  );
}

function DeclarationCard({
  declaration,
}: {
  declaration: NonNullable<TaxSimulationResult["declaration"]>;
}) {
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-800">
        FY {declaration.financialYear} — Your declared position
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Annual gross" value={formatINR(declaration.annualGross)} />
        <MiniStat
          label="80C declared"
          value={`${formatINR(declaration.section80C.declared)} / ${formatINR(declaration.section80C.limit)}`}
        />
        <MiniStat
          label="80D declared"
          value={`${formatINR(declaration.section80D.declared)} / ${formatINR(declaration.section80D.limit)}`}
        />
        <MiniStat
          label="HRA exemption (est.)"
          value={formatINR(declaration.hraExemptionEstimated)}
        />
      </div>
    </div>
  );
}

function RegimeComparisonCard({
  comparison,
}: {
  comparison: TaxSimulationResult["regimeComparison"];
}) {
  return (
    <div className="mb-4 rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-semibold text-slate-800">Old vs New regime (current)</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <MiniStat
          label="Old regime tax"
          value={formatINR(comparison.old.estimatedTax)}
        />
        <MiniStat
          label="New regime tax"
          value={formatINR(comparison.new.estimatedTax)}
        />
        <MiniStat
          label={`Better: ${comparison.recommended} regime`}
          value={formatINR(comparison.difference)}
          highlight
        />
      </div>
    </div>
  );
}

function SlabBreakdownTable({
  title,
  slabs,
}: {
  title: string;
  slabs: TaxSimulationResult["slabBreakdown"];
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-800">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">Slab</th>
              <th className="px-3 py-2">Rate</th>
              <th className="px-3 py-2">Taxable in slab</th>
              <th className="px-3 py-2">Tax</th>
            </tr>
          </thead>
          <tbody>
            {slabs.map((slab) => (
              <tr key={`${slab.from}-${slab.rate}`} className="border-t border-slate-100">
                <td className="px-3 py-2">{formatSlabLabel(slab.from, slab.to)}</td>
                <td className="px-3 py-2">{(slab.rate * 100).toFixed(0)}%</td>
                <td className="px-3 py-2">{formatINR(slab.taxableAmount)}</td>
                <td className="px-3 py-2 font-medium">{formatINR(slab.taxAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-white"}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? "text-emerald-800" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
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
    <div
      className={`rounded-xl border p-4 ${highlight ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`text-xl font-bold ${highlight ? "text-emerald-800" : "text-slate-900"}`}
      >
        {value}
      </p>
    </div>
  );
}
