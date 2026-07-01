"use client";

import type { PayslipComparison, PayslipRecord } from "@/lib/types";
import { apiFetch, formatINR } from "@/lib/client/api";
import { useEffect, useMemo, useState } from "react";
import { ErrorBox, PanelShell, PrimaryButton } from "./shared";

interface PayrollPeriod {
  month: string;
  year: number;
  key: string;
  label: string;
}

function toPeriod(record: PayslipRecord): PayrollPeriod {
  return {
    month: record.month,
    year: record.year,
    key: `${record.year}-${record.month}`,
    label: `${record.month} ${record.year}`,
  };
}

export function PayslipComparePanel() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [periodA, setPeriodA] = useState("");
  const [periodB, setPeriodB] = useState("");
  const [comparison, setComparison] = useState<PayslipComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPeriods() {
      try {
        const data = await apiFetch<{ records: PayslipRecord[] }>("/api/payroll");
        const available = data.records.map(toPeriod);
        setPeriods(available);

        if (available.length >= 2) {
          setPeriodA(available[available.length - 2].key);
          setPeriodB(available[available.length - 1].key);
        } else if (available.length === 1) {
          setPeriodA(available[0].key);
          setPeriodB(available[0].key);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load payroll periods");
      } finally {
        setLoadingPeriods(false);
      }
    }

    void loadPeriods();
  }, []);

  const periodMap = useMemo(
    () => new Map(periods.map((p) => [p.key, p])),
    [periods]
  );

  async function compare() {
    const a = periodMap.get(periodA);
    const b = periodMap.get(periodB);
    if (!a || !b) {
      setError("Select two valid payslip periods.");
      return;
    }

    setLoading(true);
    setError("");
    setComparison(null);

    try {
      const data = await apiFetch<{ comparison: PayslipComparison }>(
        `/api/payslips/compare?monthA=${a.month}&yearA=${a.year}&monthB=${b.month}&yearB=${b.year}`
      );
      setComparison(data.comparison);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  }

  if (loadingPeriods) {
    return (
      <PanelShell title="Payslip Comparison">
        Loading available payslip periods...
      </PanelShell>
    );
  }

  if (periods.length === 0) {
    return (
      <PanelShell title="Payslip Comparison">
        <p className="text-sm text-slate-600">
          No payslip data available to compare. Upload payslips on the{" "}
          <strong>Upload</strong> tab or ensure payroll records exist for your
          account.
        </p>
      </PanelShell>
    );
  }

  return (
    <PanelShell title="Payslip Comparison">
      <p className="mb-4 text-sm text-slate-600">
        Compare earnings, deductions, and net pay across two months from your
        available payroll records ({periods.length} period
        {periods.length !== 1 ? "s" : ""} on file).
      </p>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <PeriodSelect
          label="Period A"
          value={periodA}
          periods={periods}
          onChange={setPeriodA}
        />
        <PeriodSelect
          label="Period B"
          value={periodB}
          periods={periods}
          onChange={setPeriodB}
        />
      </div>

      {periods.length < 2 && (
        <p className="mb-4 text-xs text-amber-700">
          At least two payslip periods are needed for a meaningful comparison.
          Upload another month&apos;s payslip to compare.
        </p>
      )}

      <PrimaryButton
        onClick={compare}
        disabled={loading || periods.length < 2 || periodA === periodB}
      >
        {loading ? "Comparing..." : "Compare Payslips"}
      </PrimaryButton>

      {periodA === periodB && periods.length >= 2 && (
        <p className="mt-2 text-xs text-slate-500">
          Select two different periods to compare.
        </p>
      )}

      {error && (
        <div className="mt-4">
          <ErrorBox message={error} />
        </div>
      )}

      {comparison && (
        <div className="mt-6">
          <p className="mb-4 rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            {comparison.summary}
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Field</th>
                  <th className="px-4 py-3">{comparison.monthA}</th>
                  <th className="px-4 py-3">{comparison.monthB}</th>
                  <th className="px-4 py-3">Change</th>
                  <th className="px-4 py-3">%</th>
                </tr>
              </thead>
              <tbody>
                {comparison.changes.map((c) => (
                  <tr key={c.field} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{c.field}</td>
                    <td className="px-4 py-3">{formatINR(c.valueA)}</td>
                    <td className="px-4 py-3">{formatINR(c.valueB)}</td>
                    <td
                      className={`px-4 py-3 font-medium ${c.difference >= 0 ? "text-emerald-700" : "text-red-700"}`}
                    >
                      {c.difference >= 0 ? "+" : ""}
                      {formatINR(c.difference)}
                    </td>
                    <td className="px-4 py-3">
                      {c.percentChange !== null ? `${c.percentChange}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PanelShell>
  );
}

function PeriodSelect({
  label,
  value,
  periods,
  onChange,
}: {
  label: string;
  value: string;
  periods: PayrollPeriod[];
  onChange: (key: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        {periods.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}
