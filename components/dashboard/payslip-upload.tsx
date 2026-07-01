"use client";

import type { UploadedPayslip } from "@/lib/types";
import { apiFetch, formatINR } from "@/lib/client/api";
import { useEffect, useState } from "react";
import {
  ErrorBox,
  PanelShell,
  PrimaryButton,
  SuccessBox,
} from "./shared";

export function PayslipUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [useMockOcr, setUseMockOcr] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    upload: UploadedPayslip;
    validation: { valid: boolean; warnings: string[] };
    usedMockOcr: boolean;
  } | null>(null);
  const [uploads, setUploads] = useState<UploadedPayslip[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ uploads: UploadedPayslip[] }>("/api/payslips/upload")
      .then((data) => setUploads(data.uploads))
      .catch(() => {});
  }, [result]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file && !useMockOcr) return;

    setUploading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    if (file) {
      formData.append("file", file);
    }
    formData.append("useMockOcr", String(useMockOcr));

    try {
      const token = localStorage.getItem("finwell_token");
      const response = await fetch("/api/payslips/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <PanelShell title="Payslip Upload & OCR">
      <p className="mb-4 text-sm text-slate-600">
        Upload a payslip PDF or image. OCR uses the LLM wrapper when configured;
        otherwise mock OCR sample data is applied for demo.
      </p>

      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Payslip file (PDF, JPEG, PNG, WebP)
          </label>
          <input
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={useMockOcr}
            onChange={(e) => setUseMockOcr(e.target.checked)}
          />
          Use mock OCR (recommended for demo without LLM token)
        </label>

        <PrimaryButton type="submit" disabled={(!file && !useMockOcr) || uploading}>
          {uploading ? "Processing..." : useMockOcr && !file ? "Run Mock Extraction" : "Upload & Extract"}
        </PrimaryButton>
        {!file && !useMockOcr && (
          <p className="text-xs text-slate-500">
            Select a payslip file, or enable mock OCR to demo without uploading.
          </p>
        )}
      </form>

      {error && <div className="mt-4"><ErrorBox message={error} /></div>}

      {result?.upload.extractedFields && (
        <div className="mt-6 space-y-3">
          <SuccessBox
            message={`Extracted from ${result.upload.fileName}${result.usedMockOcr ? " (mock OCR)" : " (LLM OCR)"}`}
          />
          {!result.validation.valid && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-medium">Validation warnings:</p>
              <ul className="mt-1 list-inside list-disc">
                {result.validation.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <ExtractedFieldsView fields={result.upload.extractedFields} />
        </div>
      )}

      {uploads.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Previous uploads</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            {uploads.map((u) => (
              <li key={u.id} className="rounded-lg border border-slate-100 px-3 py-2">
                {u.fileName} — {new Date(u.uploadedAt).toLocaleString()} — {u.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </PanelShell>
  );
}

function ExtractedFieldsView({ fields }: { fields: NonNullable<UploadedPayslip["extractedFields"]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
      <Field label="Period" value={`${fields.month} ${fields.year}`} />
      <Field label="Basic" value={formatINR(fields.earnings.basic)} />
      <Field label="HRA" value={formatINR(fields.earnings.hra)} />
      <Field label="LTA" value={formatINR(fields.earnings.lta)} />
      <Field label="Gross Pay" value={formatINR(fields.earnings.grossPay)} />
      <Field label="PF" value={formatINR(fields.deductions.providentFund)} />
      <Field label="TDS" value={formatINR(fields.deductions.incomeTaxTds)} />
      <Field label="Net Pay" value={formatINR(fields.netPay)} highlight />
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${highlight ? "border-emerald-200 bg-emerald-50" : "border-slate-100"}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-medium ${highlight ? "text-emerald-800" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}
