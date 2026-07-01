"use client";

import type { AuditLogEntry } from "@/lib/types";
import { apiFetch } from "@/lib/client/api";
import { useEffect, useState } from "react";
import { ErrorBox, PanelShell } from "./shared";

interface AdminPayrollRow {
  employeeId: string;
  month: string;
  year: number;
  netPay: number;
  grossPay: number;
  totalDeductions: number;
}

export function AdminPanel() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [payroll, setPayroll] = useState<AdminPayrollRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch<{ logs: AuditLogEntry[] }>("/api/audit?limit=30"),
      apiFetch<{ records: AdminPayrollRow[] }>("/api/payroll"),
    ])
      .then(([auditData, payrollData]) => {
        setLogs(auditData.logs);
        setPayroll(payrollData.records);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <PanelShell title="Admin Console"><ErrorBox message={error} /></PanelShell>;

  return (
    <div className="space-y-6">
      <PanelShell title="Admin — Payroll Summary (Sanitized)">
        <p className="mb-4 text-sm text-slate-600">
          Admin view shows summary fields only — no full salary breakup to minimize data exposure.
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">Deductions</th>
                <th className="px-4 py-3">Net</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map((r, i) => (
                <tr key={`${r.employeeId}-${r.month}-${i}`} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{r.employeeId}</td>
                  <td className="px-4 py-3">{r.month} {r.year}</td>
                  <td className="px-4 py-3">₹{r.grossPay.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">₹{r.totalDeductions.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">₹{r.netPay.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelShell>

      <PanelShell title="Audit Log">
        <div className="max-h-96 overflow-y-auto space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-slate-100 px-3 py-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>{new Date(log.timestamp).toLocaleString()}</span>
                <span className="font-medium text-indigo-700">{log.action}</span>
              </div>
              <p className="mt-1 text-slate-700">{log.userEmail} — {log.resourceType}{log.details ? `: ${log.details}` : ""}</p>
            </div>
          ))}
        </div>
      </PanelShell>
    </div>
  );
}
