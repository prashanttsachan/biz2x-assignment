"use client";

import type { UploadedPayslip } from "@/lib/types";
import { apiFetch, formatINR } from "@/lib/client/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ErrorBox,
  PanelShell,
  PrimaryButton,
  SuccessBox,
} from "./shared";

const ACCEPT = ".pdf,image/jpeg,image/png,image/webp";
const ACCEPT_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export function PayslipUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [llmConfigured, setLlmConfigured] = useState<boolean | null>(null);
  const [useMockOcr, setUseMockOcr] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    upload: UploadedPayslip;
    validation: { valid: boolean; warnings: string[] };
    usedMockOcr: boolean;
  } | null>(null);
  const [uploads, setUploads] = useState<UploadedPayslip[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ llmConfigured: boolean }>("/api/config")
      .then((data) => {
        setLlmConfigured(data.llmConfigured);
        setUseMockOcr(!data.llmConfigured);
      })
      .catch(() => {
        setLlmConfigured(false);
        setUseMockOcr(true);
      });
  }, []);

  useEffect(() => {
    apiFetch<{ uploads: UploadedPayslip[] }>("/api/payslips/upload")
      .then((data) => setUploads(data.uploads))
      .catch(() => {});
  }, [result]);

  const pickFile = useCallback((picked: File | null) => {
    if (!picked) {
      setFile(null);
      return;
    }
    if (!ACCEPT_MIME.includes(picked.type)) {
      setError("Invalid file type. Upload PDF, JPEG, PNG, or WebP.");
      return;
    }
    setError("");
    setFile(picked);
    if (llmConfigured) {
      setUseMockOcr(false);
    }
  }, [llmConfigured]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0] ?? null);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();

    const needsFile = !useMockOcr;
    if (needsFile && !file) {
      setError("Please select a payslip file to upload.");
      return;
    }
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

  const canSubmit = useMockOcr ? true : Boolean(file);
  const submitLabel = uploading
    ? "Processing..."
    : useMockOcr && !file
      ? "Run Mock Extraction"
      : useMockOcr
        ? "Upload with Mock OCR"
        : "Upload & Extract with LLM";

  return (
    <PanelShell title="Payslip Upload & OCR">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {llmConfigured === null ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            Checking LLM status...
          </span>
        ) : llmConfigured ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
            LLM OCR enabled — upload a real payslip file
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            LLM not configured — set LLM_API_TOKEN in .env and restart the server
          </span>
        )}
      </div>

      <form onSubmit={handleUpload} className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
            dragOver
              ? "border-indigo-500 bg-indigo-50"
              : file
                ? "border-emerald-400 bg-emerald-50"
                : "border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <>
              <p className="text-sm font-semibold text-emerald-800">{file.name}</p>
              <p className="mt-1 text-xs text-emerald-700">
                {(file.size / 1024).toFixed(1)} KB · Click or drop to replace
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-800">
                Click to browse or drag & drop your payslip here
              </p>
              <p className="mt-1 text-xs text-slate-500">
                PDF, JPEG, PNG, or WebP · max 10 MB
              </p>
            </>
          )}
        </div>

        {llmConfigured && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={useMockOcr}
              onChange={(e) => setUseMockOcr(e.target.checked)}
            />
            Use mock OCR instead (demo sample data, ignores file content)
          </label>
        )}

        {!llmConfigured && (
          <p className="text-xs text-slate-500">
            Without LLM token you can run mock extraction without a file, or upload a file
            and it will still use sample data until LLM is configured.
          </p>
        )}

        <PrimaryButton type="submit" disabled={!canSubmit || uploading}>
          {submitLabel}
        </PrimaryButton>

        {!file && llmConfigured && !useMockOcr && (
          <p className="text-xs text-slate-500">
            Select a payslip file above to enable LLM extraction.
          </p>
        )}
      </form>

      {error && (
        <div className="mt-4">
          <ErrorBox message={error} />
        </div>
      )}

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
          <h3 className="mb-2 text-sm font-semibold text-slate-800">
            Previous uploads
          </h3>
          <ul className="space-y-2 text-sm text-slate-600">
            {uploads.map((u) => (
              <li
                key={u.id}
                className="rounded-lg border border-slate-100 px-3 py-2"
              >
                {u.fileName} — {new Date(u.uploadedAt).toLocaleString()} —{" "}
                {u.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </PanelShell>
  );
}

function ExtractedFieldsView({
  fields,
}: {
  fields: NonNullable<UploadedPayslip["extractedFields"]>;
}) {
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

function Field({
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
      className={`rounded-lg border px-3 py-2 ${highlight ? "border-emerald-200 bg-emerald-50" : "border-slate-100"}`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`font-medium ${highlight ? "text-emerald-800" : "text-slate-900"}`}
      >
        {value}
      </p>
    </div>
  );
}
