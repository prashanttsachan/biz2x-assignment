import {
  MOCK_PAYROLL,
  MOCK_TAX_DECLARATIONS,
} from "@/lib/data/mock-payroll";
import { payslipUploadStore } from "@/lib/data/store";
import type {
  AnswerSource,
  PayslipComparison,
  PayslipRecord,
  TaxDeclaration,
} from "@/lib/types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function payrollPeriodKey(record: PayslipRecord): string {
  return `${record.year}-${record.month}`;
}

function sortPayrollRecords(records: PayslipRecord[]): PayslipRecord[] {
  return [...records].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month);
  });
}

function getUploadedPayrollRecords(employeeId: string): PayslipRecord[] {
  return payslipUploadStore
    .listByEmployee(employeeId)
    .filter((u) => u.status === "completed" && u.extractedFields)
    .map((u) => u.extractedFields!);
}

/** Merges mock structured payroll with successfully extracted uploaded payslips. */
export function getStructuredPayroll(employeeId: string): PayslipRecord[] {
  const mock = MOCK_PAYROLL.filter((p) => p.employeeId === employeeId);
  const uploaded = getUploadedPayrollRecords(employeeId);

  const byPeriod = new Map<string, PayslipRecord>();
  for (const record of mock) {
    byPeriod.set(payrollPeriodKey(record), record);
  }
  // Uploaded payslips override mock data for the same month/year
  for (const record of uploaded) {
    byPeriod.set(payrollPeriodKey(record), record);
  }

  return sortPayrollRecords(Array.from(byPeriod.values()));
}

export function getAllPayrollRecords(): PayslipRecord[] {
  const employeeIds = new Set<string>();
  MOCK_PAYROLL.forEach((p) => employeeIds.add(p.employeeId));
  payslipUploadStore.listAll().forEach((u) => employeeIds.add(u.employeeId));

  return Array.from(employeeIds).flatMap((id) => getStructuredPayroll(id));
}

export function getPayslipById(
  employeeId: string,
  payslipId: string
): PayslipRecord | undefined {
  const structured = MOCK_PAYROLL.find(
    (p) => p.id === payslipId && p.employeeId === employeeId
  );
  if (structured) return structured;

  const uploaded = payslipUploadStore.get(payslipId);
  if (
    uploaded?.employeeId === employeeId &&
    uploaded.extractedFields
  ) {
    return uploaded.extractedFields;
  }
  return undefined;
}

export function getLatestPayslip(
  employeeId: string
): PayslipRecord | undefined {
  const records = getStructuredPayroll(employeeId);
  return records[records.length - 1];
}

export function getTaxDeclaration(
  employeeId: string
): TaxDeclaration | undefined {
  return MOCK_TAX_DECLARATIONS.find((d) => d.employeeId === employeeId);
}

export function getUploadedPayslips(employeeId: string) {
  return payslipUploadStore.listByEmployee(employeeId);
}

export function comparePayslips(
  employeeId: string,
  monthA: string,
  yearA: number,
  monthB: string,
  yearB: number
): PayslipComparison | null {
  const records = getStructuredPayroll(employeeId);
  const a = records.find((r) => r.month === monthA && r.year === yearA);
  const b = records.find((r) => r.month === monthB && r.year === yearB);
  if (!a || !b) return null;

  const fields: { field: string; getValue: (p: PayslipRecord) => number }[] =
    [
      { field: "Basic Salary", getValue: (p) => p.earnings.basic },
      { field: "HRA", getValue: (p) => p.earnings.hra },
      { field: "LTA", getValue: (p) => p.earnings.lta },
      { field: "Special Allowance", getValue: (p) => p.earnings.specialAllowance },
      { field: "Gross Pay", getValue: (p) => p.earnings.grossPay },
      { field: "Provident Fund", getValue: (p) => p.deductions.providentFund },
      { field: "Professional Tax", getValue: (p) => p.deductions.professionalTax },
      { field: "Income Tax (TDS)", getValue: (p) => p.deductions.incomeTaxTds },
      { field: "Total Deductions", getValue: (p) => p.deductions.totalDeductions },
      { field: "Reimbursements", getValue: (p) => p.reimbursements.total },
      { field: "Net Pay", getValue: (p) => p.netPay },
    ];

  const changes = fields.map(({ field, getValue }) => {
    const valueA = getValue(a);
    const valueB = getValue(b);
    const difference = valueB - valueA;
    const percentChange =
      valueA === 0 ? null : Math.round((difference / valueA) * 10000) / 100;
    return { field, valueA, valueB, difference, percentChange };
  });

  const netChange = changes.find((c) => c.field === "Net Pay");
  const tdsChange = changes.find((c) => c.field === "Income Tax (TDS)");
  const summaryParts: string[] = [];
  if (netChange) {
    summaryParts.push(
      `Net pay changed by ₹${netChange.difference.toLocaleString("en-IN")} (${netChange.percentChange ?? 0}%)`
    );
  }
  if (tdsChange && tdsChange.difference !== 0) {
    summaryParts.push(
      `TDS ${tdsChange.difference > 0 ? "increased" : "decreased"} by ₹${Math.abs(tdsChange.difference).toLocaleString("en-IN")}`
    );
  }

  return {
    monthA: `${monthA} ${yearA}`,
    monthB: `${monthB} ${yearB}`,
    changes,
    summary: summaryParts.join(". ") || "No significant changes detected.",
  };
}

export function buildPayrollContext(employeeId: string): {
  payrollJson: string;
  taxDeclarationJson: string;
  uploadedPayslipsJson: string;
  sources: AnswerSource[];
} {
  const payroll = getStructuredPayroll(employeeId);
  const taxDeclaration = getTaxDeclaration(employeeId);
  const uploaded = getUploadedPayslips(employeeId);

  const sources: AnswerSource[] = payroll.flatMap((p) => [
    {
      type: (p.source === "uploaded" ? "payslip" : "payroll") as
        | "payslip"
        | "payroll",
      reference: `${p.month} ${p.year} payslip${p.source === "uploaded" ? " (uploaded)" : ""}`,
      field: "netPay",
      value: p.netPay,
    },
  ]);

  if (taxDeclaration) {
    sources.push({
      type: "tax_declaration",
      reference: `FY ${taxDeclaration.financialYear} tax declaration`,
      field: "section80C.declared",
      value: taxDeclaration.section80C.declared,
    });
  }

  return {
    payrollJson: JSON.stringify(payroll, null, 2),
    taxDeclarationJson: taxDeclaration
      ? JSON.stringify(taxDeclaration, null, 2)
      : "No tax declaration on file.",
    uploadedPayslipsJson:
      uploaded.length > 0
        ? JSON.stringify(
            uploaded.map((u) => ({
              fileName: u.fileName,
              uploadedAt: u.uploadedAt,
              extractedFields: u.extractedFields,
            })),
            null,
            2
          )
        : "No uploaded payslips.",
    sources,
  };
}

export function explainNetPay(payslip: PayslipRecord) {
  const steps = [
    {
      label: "Gross Pay",
      formula: "Sum of all earnings components",
      result: payslip.earnings.grossPay,
    },
    {
      label: "Total Deductions",
      formula: "PF + Professional Tax + TDS + Other",
      result: payslip.deductions.totalDeductions,
    },
    {
      label: "Reimbursements",
      formula: "Travel + Medical + Other reimbursements",
      result: payslip.reimbursements.total,
    },
    {
      label: "Net Pay",
      formula: "Gross Pay - Total Deductions + Reimbursements",
      result: payslip.netPay,
    },
  ];
  return steps;
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
