"use client";

import type { PayslipComparison } from "@/lib/types";
import { apiFetch, formatINR } from "@/lib/client/api";
import { useState } from "react";
import { ErrorBox, PanelShell, PrimaryButton } from "./shared";

export function PayslipComparePanel() {
  const [monthA, setMonthA] = useState("Feb");
  const [yearA, setYearA] = useState("2025");
  const [monthB, setMonthB] = useState("Mar");
  const [yearB, setYearB] = useState("2025");
  const [comparison, setComparison] = useState<PayslipComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function compare() {
    setLoading(true);
    setError("");
    setComparison(null);

    try {
      const data = await apiFetch<{ comparison: PayslipComparison }>(
        `/api/payslips/compare?monthA=${monthA}&yearA=${yearA}&monthB=${monthB}&yearB=${yearB}`
      );
      setComparison(data.comparison);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PanelShell title="Payslip Comparison">
      <p className="mb-4 text-sm text-slate-600">
        Compare earnings, deductions, and net pay across two months to identify changes.
      </p>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <PeriodSelect label="Period A" month={monthA} year={yearA} onMonth={setMonthA} onYear={setYearA} />
        <PeriodSelect label="Period B" month={monthB} year={yearB} onMonth={setMonthB} onYear={setYearB} />
      </div>

      <PrimaryButton onClick={compare} disabled={loading}>
        {loading ? "Comparing..." : "Compare Payslips"}
      </PrimaryButton>

      {error && <div className="mt-4"><ErrorBox message={error} /></div>}

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
                    <td className={`px-4 py-3 font-medium ${c.difference >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {c.difference >= 0 ? "+" : ""}{formatINR(c.difference)}
                    </td>
                    <td className="px-4 py-3">{c.percentChange !== null ? `${c.percentChange}%` : "—"}</td>
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
  month,
  year,
  onMonth,
  onYear,
}: {
  label: string;
  month: string;
  year: string;
  onMonth: (v: string) => void;
  onYear: (v: string) => void;
}) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
      <div className="flex gap-2">
        <select
          value={month}
          onChange={(e) => onMonth(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm"
        >
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => onYear(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
        >
          <option value="2025">2025</option>
          <option value="2024">2024</option>
        </select>
      </div>
    </div>
  );
}
