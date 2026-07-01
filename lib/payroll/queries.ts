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

export function getStructuredPayroll(employeeId: string): PayslipRecord[] {
  return MOCK_PAYROLL.filter((p) => p.employeeId === employeeId).sort(
    (a, b) => {
      const months = [
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
      if (a.year !== b.year) return a.year - b.year;
      return months.indexOf(a.month) - months.indexOf(b.month);
    }
  );
}

export function getAllPayrollRecords(): PayslipRecord[] {
  return [...MOCK_PAYROLL];
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
      type: "payroll" as const,
      reference: `${p.month} ${p.year} payslip`,
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
