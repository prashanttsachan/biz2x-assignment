import type { PayslipRecord, TaxDeclaration, User } from "@/lib/types";

export const MOCK_USERS: User[] = [
  {
    id: "user-001",
    email: "john.doe@company.com",
    name: "John Doe",
    employeeId: "EMP001",
    role: "employee",
    department: "Engineering",
  },
  {
    id: "user-002",
    email: "jane.smith@company.com",
    name: "Jane Smith",
    employeeId: "EMP002",
    role: "employee",
    department: "Product",
  },
  {
    id: "user-admin",
    email: "payroll.admin@company.com",
    name: "Payroll Admin",
    employeeId: "ADMIN001",
    role: "admin",
    department: "Finance",
  },
];

export const MOCK_PASSWORDS: Record<string, string> = {
  "john.doe@company.com": "employee123",
  "jane.smith@company.com": "employee123",
  "payroll.admin@company.com": "admin123",
};

function createPayslip(
  employeeId: string,
  month: string,
  year: number,
  overrides: Partial<{
    basic: number;
    hra: number;
    lta: number;
    specialAllowance: number;
    pf: number;
    pt: number;
    tds: number;
    travelReimb: number;
    netPay: number;
    ytdGross: number;
    ytdNet: number;
    ytdPf: number;
    ytdTds: number;
    ytdPt: number;
  }> = {}
): PayslipRecord {
  const basic = overrides.basic ?? 50000;
  const hra = overrides.hra ?? 20000;
  const lta = overrides.lta ?? 5000;
  const specialAllowance = overrides.specialAllowance ?? 15000;
  const otherAllowances = 2000;
  const grossPay = basic + hra + lta + specialAllowance + otherAllowances;
  const pf = overrides.pf ?? 6000;
  const pt = overrides.pt ?? 200;
  const tds = overrides.tds ?? 8500;
  const otherDeductions = 500;
  const totalDeductions = pf + pt + tds + otherDeductions;
  const travelReimb = overrides.travelReimb ?? 3000;
  const reimbursements = {
    travel: travelReimb,
    medical: 1500,
    other: 500,
    total: travelReimb + 1500 + 500,
  };
  const netPay =
    overrides.netPay ?? grossPay - totalDeductions + reimbursements.total;

  return {
    id: `${employeeId}-${year}-${month}`,
    employeeId,
    month,
    year,
    payPeriod: `01-${month}-${year} to 30-${month}-${year}`,
    earnings: {
      basic,
      hra,
      lta,
      specialAllowance,
      otherAllowances,
      grossPay,
    },
    deductions: {
      providentFund: pf,
      professionalTax: pt,
      incomeTaxTds: tds,
      otherDeductions,
      totalDeductions,
    },
    reimbursements,
    netPay,
    ytd: {
      grossPay: overrides.ytdGross ?? grossPay * 3,
      netPay: overrides.ytdNet ?? netPay * 3,
      providentFund: overrides.ytdPf ?? pf * 3,
      incomeTaxTds: overrides.ytdTds ?? tds * 3,
      professionalTax: overrides.ytdPt ?? pt * 3,
    },
    source: "structured",
  };
}

export const MOCK_PAYROLL: PayslipRecord[] = [
  createPayslip("EMP001", "Jan", 2025),
  createPayslip("EMP001", "Feb", 2025, {
    tds: 9200,
    netPay: 78900,
    ytdGross: 184000,
    ytdNet: 236700,
    ytdTds: 17700,
  }),
  createPayslip("EMP001", "Mar", 2025, {
    basic: 52000,
    hra: 20800,
    tds: 9800,
    pf: 6240,
    netPay: 81260,
    ytdGross: 276000,
    ytdNet: 317960,
    ytdPf: 18240,
    ytdTds: 27500,
    ytdPt: 600,
  }),
  createPayslip("EMP002", "Jan", 2025, {
    basic: 60000,
    hra: 24000,
    lta: 6000,
    specialAllowance: 18000,
    pf: 7200,
    tds: 12000,
    netPay: 90600,
    ytdGross: 108000,
    ytdNet: 90600,
    ytdPf: 7200,
    ytdTds: 12000,
  }),
  createPayslip("EMP002", "Feb", 2025, {
    basic: 60000,
    hra: 24000,
    lta: 6000,
    specialAllowance: 18000,
    pf: 7200,
    tds: 12000,
    travelReimb: 0,
    netPay: 87600,
    ytdGross: 216000,
    ytdNet: 178200,
    ytdPf: 14400,
    ytdTds: 24000,
  }),
  createPayslip("EMP002", "Mar", 2025, {
    basic: 60000,
    hra: 24000,
    lta: 6000,
    specialAllowance: 18000,
    pf: 7200,
    tds: 13500,
    netPay: 89100,
    ytdGross: 324000,
    ytdNet: 267300,
    ytdPf: 21600,
    ytdTds: 37500,
  }),
];

export const MOCK_TAX_DECLARATIONS: TaxDeclaration[] = [
  {
    employeeId: "EMP001",
    financialYear: "2024-25",
    section80C: {
      declared: 120000,
      limit: 150000,
      proofSubmitted: true,
      proofDueDate: "2025-03-31",
    },
    section80D: {
      declared: 15000,
      limit: 25000,
      proofSubmitted: false,
      proofDueDate: "2025-03-31",
    },
    hra: {
      declared: true,
      rentPaidMonthly: 18000,
      proofSubmitted: true,
      proofDueDate: "2025-03-31",
    },
    lta: {
      declared: true,
      amount: 5000,
      proofSubmitted: false,
      proofDueDate: "2025-03-31",
    },
    homeLoanInterest: {
      declared: 0,
      proofSubmitted: false,
      proofDueDate: "2025-03-31",
    },
  },
  {
    employeeId: "EMP002",
    financialYear: "2024-25",
    section80C: {
      declared: 80000,
      limit: 150000,
      proofSubmitted: false,
      proofDueDate: "2025-03-31",
    },
    section80D: {
      declared: 25000,
      limit: 25000,
      proofSubmitted: true,
      proofDueDate: "2025-03-31",
    },
    hra: {
      declared: true,
      rentPaidMonthly: 22000,
      proofSubmitted: false,
      proofDueDate: "2025-03-31",
    },
    lta: {
      declared: false,
      amount: 0,
      proofSubmitted: false,
      proofDueDate: "2025-03-31",
    },
    homeLoanInterest: {
      declared: 150000,
      proofSubmitted: false,
      proofDueDate: "2025-03-31",
    },
  },
];

export const MOCK_OCR_SAMPLE: Omit<
  PayslipRecord,
  "id" | "employeeId" | "source"
> = {
  month: "Apr",
  year: 2025,
  payPeriod: "01-Apr-2025 to 30-Apr-2025",
  earnings: {
    basic: 52000,
    hra: 20800,
    lta: 5000,
    specialAllowance: 15000,
    otherAllowances: 2000,
    grossPay: 94800,
  },
  deductions: {
    providentFund: 6240,
    professionalTax: 200,
    incomeTaxTds: 10200,
    otherDeductions: 500,
    totalDeductions: 17140,
  },
  reimbursements: {
    travel: 2500,
    medical: 1000,
    other: 0,
    total: 3500,
  },
  netPay: 81160,
  ytd: {
    grossPay: 370800,
    netPay: 399120,
    providentFund: 24480,
    incomeTaxTds: 37700,
    professionalTax: 800,
  },
};
