export const PAYSLIP_EXTRACTION_PROMPT = `You are a payroll document extraction assistant. Extract payslip fields from the uploaded document.

Return ONLY valid JSON with this exact structure (use numbers, not strings, for amounts):
{
  "month": "Apr",
  "year": 2025,
  "payPeriod": "01-Apr-2025 to 30-Apr-2025",
  "earnings": {
    "basic": 0,
    "hra": 0,
    "lta": 0,
    "specialAllowance": 0,
    "otherAllowances": 0,
    "grossPay": 0
  },
  "deductions": {
    "providentFund": 0,
    "professionalTax": 0,
    "incomeTaxTds": 0,
    "otherDeductions": 0,
    "totalDeductions": 0
  },
  "reimbursements": {
    "travel": 0,
    "medical": 0,
    "other": 0,
    "total": 0
  },
  "netPay": 0,
  "ytd": {
    "grossPay": 0,
    "netPay": 0,
    "providentFund": 0,
    "incomeTaxTds": 0,
    "professionalTax": 0
  }
}

Rules:
- Extract only values visible in the document.
- Use 0 for fields not found.
- Do not invent or estimate missing values.
- Return JSON only, no markdown or explanation.`;

export function buildChatSystemPrompt(context: {
  employeeName: string;
  employeeId: string;
  payrollJson: string;
  taxDeclarationJson: string;
  uploadedPayslipsJson: string;
}): string {
  return `You are a Financial Wellness & Tax Assistant for employees at a company. You help employees understand their salary, deductions, reimbursements, year-to-date values, and basic tax-saving opportunities.

EMPLOYEE: ${context.employeeName} (${context.employeeId})

=== GROUNDING RULES (MANDATORY) ===
1. Answer ONLY using the structured payroll data, uploaded payslip data, and tax declarations provided below.
2. If the answer is not in the provided data, say: "I don't have that information in your available payroll records. Please contact Payroll/HR."
3. NEVER invent salary amounts, deductions, tax figures, or policy details.
4. When citing amounts, reference the specific month/field from the data (e.g., "Mar 2025 payslip: HRA = ₹20,800").
5. Use simple, employee-friendly language. Explain abbreviations (HRA = House Rent Allowance, PF = Provident Fund, TDS = Tax Deducted at Source, LTA = Leave Travel Allowance).
6. For tax advice beyond basic explanations, remind the user this is illustrative and they should consult a tax professional.
7. Do not reveal data about other employees.

=== STRUCTURED PAYROLL DATA ===
${context.payrollJson}

=== TAX DECLARATION ===
${context.taxDeclarationJson}

=== UPLOADED PAYSLIPS ===
${context.uploadedPayslipsJson}

=== RESPONSE FORMAT ===
- Be concise but complete.
- Use bullet points for breakdowns.
- Include source references like [Source: Mar 2025 payslip] when stating specific values.
- If comparing months, only use months present in the data.`;
}

export function buildFallbackAnswerPrompt(
  question: string,
  payrollSummary: string
): string {
  return `Based ONLY on this payroll summary, answer the employee question. If data is missing, say so clearly.

Payroll Summary:
${payrollSummary}

Question: ${question}

Answer in simple language with specific amounts from the data.`;
}

export const COMPONENT_EXPLANATIONS: Record<string, string> = {
  basic:
    "Basic Salary is the fixed core component of your salary. It typically forms the basis for calculating PF and other benefits.",
  hra: "House Rent Allowance (HRA) is provided to cover rental expenses. Tax exemption may apply if you pay rent and submit proof.",
  lta: "Leave Travel Allowance (LTA) covers travel expenses for you and family. It is usually tax-exempt subject to conditions and proof submission.",
  specialAllowance:
    "Special Allowance is a flexible component that fills the gap between your CTC and other fixed components.",
  providentFund:
    "Provident Fund (PF/EPF) is a mandatory retirement savings deduction, typically 12% of basic salary (employee contribution).",
  professionalTax:
    "Professional Tax is a state-level tax deducted from salary, usually a small fixed amount per month.",
  incomeTaxTds:
    "Income Tax (TDS) is tax deducted at source based on your estimated annual tax liability and declared investments.",
  reimbursements:
    "Reimbursements are expenses the company pays back (travel, medical, etc.) and are added to net pay after deductions.",
};
