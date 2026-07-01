"use client";

import { useAuth } from "@/components/auth-provider";
import { RequireAuth } from "@/components/require-auth";
import { AdminPanel } from "@/components/dashboard/admin-panel";
import { ChatAssistant } from "@/components/dashboard/chat-assistant";
import { ChecklistPanel } from "@/components/dashboard/checklist-panel";
import { PayrollOverview } from "@/components/dashboard/shared";
import { PayslipComparePanel } from "@/components/dashboard/payslip-compare";
import { PayslipUpload } from "@/components/dashboard/payslip-upload";
import { TaxSimulatorPanel } from "@/components/dashboard/tax-simulator";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Tab =
  | "overview"
  | "upload"
  | "chat"
  | "tax"
  | "checklist"
  | "compare"
  | "admin";

const EMPLOYEE_TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Payroll" },
  { id: "upload", label: "Upload" },
  { id: "chat", label: "AI Assistant" },
  { id: "tax", label: "Tax Simulator" },
  { id: "checklist", label: "Checklist" },
  { id: "compare", label: "Compare" },
];

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  const tabs =
    user?.role === "admin"
      ? [...EMPLOYEE_TABS, { id: "admin" as Tab, label: "Admin" }]
      : EMPLOYEE_TABS;

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-lg font-bold text-slate-900">FinWell AI</h1>
            <p className="text-xs text-slate-500">
              {user?.name} · {user?.employeeId} · {user?.department}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-0 sm:px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {tab === "overview" && <PayrollOverview />}
        {tab === "upload" && user?.role === "employee" && <PayslipUpload />}
        {tab === "upload" && user?.role === "admin" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Payslip upload is available for employee accounts only.
          </div>
        )}
        {tab === "chat" && user?.role === "employee" && <ChatAssistant />}
        {tab === "chat" && user?.role === "admin" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            AI chat is scoped to employee payroll data. Sign in as an employee to demo.
          </div>
        )}
        {tab === "tax" && user?.role === "employee" && <TaxSimulatorPanel />}
        {tab === "tax" && user?.role === "admin" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Tax simulation is available for employee accounts.
          </div>
        )}
        {tab === "checklist" && user?.role === "employee" && <ChecklistPanel />}
        {tab === "checklist" && user?.role === "admin" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Investment checklist is available for employee accounts.
          </div>
        )}
        {tab === "compare" && user?.role === "employee" && <PayslipComparePanel />}
        {tab === "compare" && user?.role === "admin" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Payslip comparison is available for employee accounts.
          </div>
        )}
        {tab === "admin" && user?.role === "admin" && <AdminPanel />}
      </main>
    </div>
  );
}
