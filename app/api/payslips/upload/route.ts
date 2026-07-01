import { logAuditEvent } from "@/lib/audit/logger";
import {
  badRequestResponse,
  forbiddenResponse,
  getAuthUser,
  getClientIp,
  unauthorizedResponse,
} from "@/lib/api/helpers";
import { payslipUploadStore } from "@/lib/data/store";
import {
  extractPayslipFromDocument,
  validatePayslipFields,
} from "@/lib/ocr/payslip-extractor";
import { assertEmployeeAccess } from "@/lib/security/access-control";
import type { UploadedPayslip } from "@/lib/types";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "employee") {
    return forbiddenResponse("Only employees can upload payslips.");
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const useMockOcr = formData.get("useMockOcr") === "true";

  if (!file && !useMockOcr) {
    return badRequestResponse("No file uploaded.");
  }

  if (file && !ALLOWED_TYPES.includes(file.type)) {
    return badRequestResponse(
      "Invalid file type. Upload PDF, JPEG, PNG, or WebP."
    );
  }

  if (file && file.size > MAX_FILE_SIZE) {
    return badRequestResponse("File exceeds 10MB limit.");
  }

  const buffer = file ? Buffer.from(await file.arrayBuffer()) : Buffer.alloc(0);
  const uploadId = randomUUID();
  const fileName = file?.name ?? "mock-payslip-demo.pdf";
  const mimeType = file?.type ?? "application/pdf";
  const hasFile = buffer.length > 0;

  const pending: UploadedPayslip = {
    id: uploadId,
    employeeId: user.employeeId,
    fileName,
    mimeType,
    uploadedAt: new Date().toISOString(),
    extractedFields: null,
    status: "processing",
  };
  payslipUploadStore.save(pending, hasFile ? buffer : undefined);

  try {
    const extraction = await extractPayslipFromDocument({
      employeeId: user.employeeId,
      fileName,
      mimeType,
      buffer,
      useMockOcr,
    });

    extraction.fields.id = uploadId;
    extraction.fields.employeeId = user.employeeId;

    const validation = validatePayslipFields(extraction.fields);

    const completed: UploadedPayslip = {
      ...pending,
      extractedFields: extraction.fields,
      rawOcrText: extraction.rawText,
      status: "completed",
    };
    payslipUploadStore.save(completed);

    logAuditEvent({
      user,
      action: "payslip_upload",
      resourceType: "payslip",
      resourceId: uploadId,
      details: `Uploaded ${fileName}${extraction.usedMockOcr ? " (mock OCR)" : ""}`,
      ipAddress: getClientIp(request),
    });

    return Response.json({
      upload: completed,
      validation,
      usedMockOcr: extraction.usedMockOcr,
    });
  } catch (error) {
    const failed: UploadedPayslip = {
      ...pending,
      status: "failed",
      error: error instanceof Error ? error.message : "Extraction failed",
    };
    payslipUploadStore.save(failed);
    return Response.json(
      { error: "Payslip processing failed.", upload: failed },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const targetEmployeeId = searchParams.get("employeeId") ?? user.employeeId;

  try {
    assertEmployeeAccess(user, targetEmployeeId);
  } catch (e) {
    return forbiddenResponse(
      e instanceof Error ? e.message : "Access denied."
    );
  }

  const uploads = payslipUploadStore.listByEmployee(targetEmployeeId);
  logAuditEvent({
    user,
    action: "payslip_view",
    resourceType: "uploaded_payslips",
    resourceId: targetEmployeeId,
    ipAddress: getClientIp(request),
  });

  return Response.json({ uploads });
}
