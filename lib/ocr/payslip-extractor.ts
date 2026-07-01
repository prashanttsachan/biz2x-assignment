import { queryLlm } from "@/lib/ai/llm-client";
import { PAYSLIP_EXTRACTION_PROMPT } from "@/lib/ai/prompts";
import { MOCK_OCR_SAMPLE } from "@/lib/data/mock-payroll";
import type { PayslipRecord } from "@/lib/types";
import { randomUUID } from "crypto";

export interface ExtractionResult {
  fields: PayslipRecord;
  rawText?: string;
  usedMockOcr: boolean;
}

function parseExtractedJson(text: string): Partial<PayslipRecord> | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as Partial<PayslipRecord>;
  } catch {
    return null;
  }
}

function buildPayslipFromPartial(
  employeeId: string,
  partial: Partial<PayslipRecord>,
  fileName: string
): PayslipRecord {
  const base = MOCK_OCR_SAMPLE;

  return {
    id: randomUUID(),
    employeeId,
    month: partial.month ?? base.month,
    year: partial.year ?? base.year,
    payPeriod: partial.payPeriod ?? base.payPeriod,
    earnings: { ...base.earnings, ...partial.earnings },
    deductions: { ...base.deductions, ...partial.deductions },
    reimbursements: { ...base.reimbursements, ...partial.reimbursements },
    netPay: partial.netPay ?? base.netPay,
    ytd: { ...base.ytd, ...partial.ytd },
    source: "uploaded",
    uploadedAt: new Date().toISOString(),
    fileName,
  };
}

export async function extractPayslipFromDocument(params: {
  employeeId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  useMockOcr?: boolean;
}): Promise<ExtractionResult> {
  const { employeeId, fileName, mimeType, buffer, useMockOcr } = params;

  if (useMockOcr) {
    const fields = buildPayslipFromPartial(
      employeeId,
      MOCK_OCR_SAMPLE,
      fileName
    );
    return {
      fields,
      rawText: "Mock OCR output used for demonstration.",
      usedMockOcr: true,
    };
  }

  const base64 = buffer.toString("base64");
  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");

  const llmResult = await queryLlm({
    prompt: PAYSLIP_EXTRACTION_PROMPT,
    ...(isPdf ? { pdfBase64: base64 } : {}),
    ...(isImage
      ? {
          imageBase64: base64,
          imageMediaType: mimeType as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
        }
      : {}),
    metadata: { operation: "payslip_extraction", fileName },
  });

  if (llmResult.text && !llmResult.fromFallback) {
    const parsed = parseExtractedJson(llmResult.text);
    if (parsed) {
      const fields = buildPayslipFromPartial(employeeId, parsed, fileName);
      return {
        fields,
        rawText: llmResult.text,
        usedMockOcr: false,
      };
    }
  }

  const fields = buildPayslipFromPartial(
    employeeId,
    MOCK_OCR_SAMPLE,
    fileName
  );
  return {
    fields,
    rawText:
      llmResult.fromFallback
        ? "LLM unavailable — mock OCR sample applied. Set LLM_API_TOKEN for real extraction."
        : "Could not parse LLM response — mock OCR sample applied.",
    usedMockOcr: true,
  };
}

export function validatePayslipFields(
  payslip: PayslipRecord
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  const expectedNet =
    payslip.earnings.grossPay -
    payslip.deductions.totalDeductions +
    payslip.reimbursements.total;

  if (Math.abs(expectedNet - payslip.netPay) > 1) {
    warnings.push(
      `Net pay (₹${payslip.netPay}) does not match calculated value (₹${expectedNet})`
    );
  }

  const expectedGross =
    payslip.earnings.basic +
    payslip.earnings.hra +
    payslip.earnings.lta +
    payslip.earnings.specialAllowance +
    payslip.earnings.otherAllowances;

  if (Math.abs(expectedGross - payslip.earnings.grossPay) > 1) {
    warnings.push("Gross pay does not match sum of earnings components");
  }

  if (payslip.earnings.basic === 0) {
    warnings.push("Basic salary is missing or zero");
  }

  return { valid: warnings.length === 0, warnings };
}
