"use client";

import type { PayslipRecord } from "@/lib/types";
import { apiFetch, formatINR } from "@/lib/client/api";
import { useEffect, useState } from "react";

export function PayrollOverview() {
  const [records, setRecords] = useState<PayslipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ records: PayslipRecord[] }>("/api/payroll")
      .then((data) => setRecords(data.records))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PanelShell title="Payroll Overview">Loading payroll...</PanelShell>;
  if (error) return <PanelShell title="Payroll Overview"><ErrorBox message={error} /></PanelShell>;

  const latest = records[records.length - 1];

  return (
    <PanelShell title="Payroll Overview">
      {latest && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Latest Net Pay" value={formatINR(latest.netPay)} sub={`${latest.month} ${latest.year}`} />
          <StatCard label="Gross Pay" value={formatINR(latest.earnings.grossPay)} sub="Current month" />
          <StatCard label="Total Deductions" value={formatINR(latest.deductions.totalDeductions)} sub="Current month" />
          <StatCard label="YTD Net Pay" value={formatINR(latest.ytd.netPay)} sub="Year to date" />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Basic</th>
              <th className="px-4 py-3 font-medium">HRA</th>
              <th className="px-4 py-3 font-medium">PF</th>
              <th className="px-4 py-3 font-medium">TDS</th>
              <th className="px-4 py-3 font-medium">Reimb.</th>
              <th className="px-4 py-3 font-medium">Net Pay</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{r.month} {r.year}</td>
                <td className="px-4 py-3">{formatINR(r.earnings.basic)}</td>
                <td className="px-4 py-3">{formatINR(r.earnings.hra)}</td>
                <td className="px-4 py-3">{formatINR(r.deductions.providentFund)}</td>
                <td className="px-4 py-3">{formatINR(r.deductions.incomeTaxTds)}</td>
                <td className="px-4 py-3">{formatINR(r.reimbursements.total)}</td>
                <td className="px-4 py-3 font-semibold text-emerald-700">{formatINR(r.netPay)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelShell>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

export function PanelShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function SuccessBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      {message}
    </div>
  );
}

export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function InputField({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input
        {...props}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
      />
    </label>
  );
}
