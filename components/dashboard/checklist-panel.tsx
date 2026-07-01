"use client";

import type { ChecklistItem } from "@/lib/types";
import { apiFetch } from "@/lib/client/api";
import { useEffect, useState } from "react";
import { ErrorBox, PanelShell } from "./shared";

export function ChecklistPanel() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ checklist: ChecklistItem[] }>("/api/checklist")
      .then((data) => setItems(data.checklist))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PanelShell title="Investment Proof Checklist">Loading...</PanelShell>;
  if (error) return <PanelShell title="Investment Proof Checklist"><ErrorBox message={error} /></PanelShell>;

  const pending = items.filter((i) => i.status !== "submitted");

  return (
    <PanelShell title="Investment Proof Checklist">
      <p className="mb-4 text-sm text-slate-600">
        Personalized checklist based on your tax declarations and proof submission status.
      </p>

      {pending.length === 0 ? (
        <p className="text-sm text-emerald-700">All required proofs are submitted.</p>
      ) : (
        <p className="mb-4 text-sm font-medium text-slate-700">
          {pending.length} item{pending.length > 1 ? "s" : ""} need attention
        </p>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl border px-4 py-3 ${
              item.status === "submitted"
                ? "border-emerald-200 bg-emerald-50"
                : item.status === "overdue"
                  ? "border-red-200 bg-red-50"
                  : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">{item.category}</p>
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.description}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <p className="mt-2 text-xs text-slate-500">Due: {item.dueDate}</p>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function StatusBadge({ status }: { status: ChecklistItem["status"] }) {
  const styles = {
    submitted: "bg-emerald-100 text-emerald-800",
    pending: "bg-amber-100 text-amber-800",
    overdue: "bg-red-100 text-red-800",
  };
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}
