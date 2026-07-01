export type UserRole = "employee" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  employeeId: string;
  role: UserRole;
  department: string;
}

export interface SalaryBreakup {
  basic: number;
  hra: number;
  lta: number;
  specialAllowance: number;
  otherAllowances: number;
  grossPay: number;
}

export interface Deductions {
  providentFund: number;
  professionalTax: number;
  incomeTaxTds: number;
  otherDeductions: number;
  totalDeductions: number;
}

export interface Reimbursements {
  travel: number;
  medical: number;
  other: number;
  total: number;
}

export interface YearToDate {
  grossPay: number;
  netPay: number;
  providentFund: number;
  incomeTaxTds: number;
  professionalTax: number;
}

export interface PayslipRecord {
  id: string;
  employeeId: string;
  month: string;
  year: number;
  payPeriod: string;
  earnings: SalaryBreakup;
  deductions: Deductions;
  reimbursements: Reimbursements;
  netPay: number;
  ytd: YearToDate;
  source: "structured" | "uploaded";
  uploadedAt?: string;
  fileName?: string;
}

export interface TaxDeclaration {
  employeeId: string;
  financialYear: string;
  section80C: {
    declared: number;
    limit: number;
    proofSubmitted: boolean;
    proofDueDate: string;
  };
  section80D: {
    declared: number;
    limit: number;
    proofSubmitted: boolean;
    proofDueDate: string;
  };
  hra: {
    declared: boolean;
    rentPaidMonthly: number;
    proofSubmitted: boolean;
    proofDueDate: string;
  };
  lta: {
    declared: boolean;
    amount: number;
    proofSubmitted: boolean;
    proofDueDate: string;
  };
  homeLoanInterest: {
    declared: number;
    proofSubmitted: boolean;
    proofDueDate: string;
  };
}

export interface UploadedPayslip {
  id: string;
  employeeId: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
  extractedFields: PayslipRecord | null;
  rawOcrText?: string;
  status: "processing" | "completed" | "failed";
  error?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: AnswerSource[];
  timestamp: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview?: string;
}

export interface AnswerSource {
  type: "payslip" | "payroll" | "tax_declaration" | "assumption";
  reference: string;
  field?: string;
  value?: string | number;
}

export interface TaxSimulationInput {
  regime?: "old" | "new";
  additional80C?: number;
  additional80D?: number;
  additionalNps?: number;
  homeLoanInterest?: number;
}

export interface TaxSlabLine {
  from: number;
  to: number | null;
  rate: number;
  taxableAmount: number;
  taxAmount: number;
}

export interface DeclarationSnapshot {
  financialYear: string;
  annualGross: number;
  section80C: { declared: number; limit: number; remaining: number };
  section80D: { declared: number; limit: number; remaining: number };
  homeLoanInterest: { declared: number; limit: number; remaining: number };
  hraExemptionEstimated: number;
  ltaDeclared: number;
}

export interface TaxRegimeSnapshot {
  regime: "old" | "new";
  taxableIncome: number;
  estimatedTax: number;
  taxBeforeCess: number;
  cess: number;
  slabBreakdown: TaxSlabLine[];
}

export interface TaxSimulationResult {
  regime: "old" | "new";
  baselineOnly: boolean;
  annualGross: number;
  declaration: DeclarationSnapshot | null;
  currentTaxableIncome: number;
  projectedTaxableIncome: number;
  currentEstimatedTax: number;
  projectedEstimatedTax: number;
  estimatedSavings: number;
  steps: CalculationStep[];
  slabBreakdown: TaxSlabLine[];
  projectedSlabBreakdown: TaxSlabLine[];
  regimeComparison: {
    old: TaxRegimeSnapshot;
    new: TaxRegimeSnapshot;
    recommended: "old" | "new";
    difference: number;
    projectedOld: TaxRegimeSnapshot;
  };
  recommendations: string[];
  assumptions: string[];
  appliedScenario: {
    additional80C: number;
    additional80D: number;
    additionalNps: number;
    additionalHomeLoan: number;
  } | null;
}

export interface CalculationStep {
  label: string;
  formula: string;
  result: number;
}

export interface PayslipComparison {
  monthA: string;
  monthB: string;
  changes: {
    field: string;
    valueA: number;
    valueB: number;
    difference: number;
    percentChange: number | null;
  }[];
  summary: string;
}

export interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  status: "submitted" | "pending" | "overdue";
  dueDate: string;
  amount?: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
}

export type AuditAction =
  | "login"
  | "logout"
  | "payslip_upload"
  | "payslip_view"
  | "chat_query"
  | "chat_session_create"
  | "chat_session_view"
  | "chat_session_delete"
  | "tax_simulation"
  | "checklist_view"
  | "payslip_compare"
  | "admin_view";

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}
