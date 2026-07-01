import { getLatestPayslip, getTaxDeclaration } from "@/lib/payroll/queries";
import type {
  CalculationStep,
  TaxSimulationInput,
  TaxSimulationResult,
} from "@/lib/types";

const STANDARD_DEDUCTION = 50000;
const SECTION_80C_LIMIT = 150000;
const SECTION_80D_LIMIT = 25000;
const HOME_LOAN_INTEREST_LIMIT = 200000;

function estimateAnnualTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  let remaining = taxableIncome;

  const slab1 = Math.min(remaining, 300000);
  tax += slab1 * 0;
  remaining -= slab1;

  const slab2 = Math.min(remaining, 300000);
  tax += slab2 * 0.05;
  remaining -= slab2;

  const slab3 = Math.min(remaining, 300000);
  tax += slab3 * 0.1;
  remaining -= slab3;

  const slab4 = Math.min(remaining, 300000);
  tax += slab4 * 0.15;
  remaining -= slab4;

  const slab5 = Math.min(remaining, 300000);
  tax += slab5 * 0.2;
  remaining -= slab5;

  if (remaining > 0) {
    tax += remaining * 0.3;
  }

  const cess = tax * 0.04;
  return Math.round(tax + cess);
}

export function simulateTaxSavings(
  employeeId: string,
  input: TaxSimulationInput
): TaxSimulationResult {
  const latest = getLatestPayslip(employeeId);
  const declaration = getTaxDeclaration(employeeId);

  const monthlyGross = latest?.earnings.grossPay ?? 90000;
  const annualGross = monthlyGross * 12;

  const current80C = Math.min(
    declaration?.section80C.declared ?? 0,
    SECTION_80C_LIMIT
  );
  const current80D = Math.min(
    declaration?.section80D.declared ?? 0,
    SECTION_80D_LIMIT
  );
  const currentHomeLoan = Math.min(
    declaration?.homeLoanInterest.declared ?? 0,
    HOME_LOAN_INTEREST_LIMIT
  );

  const additional80C = Math.min(
    input.additional80C ?? 0,
    SECTION_80C_LIMIT - current80C
  );
  const additional80D = Math.min(
    input.additional80D ?? 0,
    SECTION_80D_LIMIT - current80D
  );
  const additionalHomeLoan = Math.min(
    input.homeLoanInterest ?? 0,
    HOME_LOAN_INTEREST_LIMIT - currentHomeLoan
  );

  const currentDeductions =
    STANDARD_DEDUCTION + current80C + current80D + currentHomeLoan;
  const projectedDeductions =
    currentDeductions + additional80C + additional80D + additionalHomeLoan;

  const currentTaxableIncome = Math.max(0, annualGross - currentDeductions);
  const projectedTaxableIncome = Math.max(0, annualGross - projectedDeductions);

  const currentEstimatedTax = estimateAnnualTax(currentTaxableIncome);
  const projectedEstimatedTax = estimateAnnualTax(projectedTaxableIncome);
  const estimatedSavings = currentEstimatedTax - projectedEstimatedTax;

  const steps: CalculationStep[] = [
    {
      label: "Annual Gross Salary",
      formula: `Monthly gross (₹${monthlyGross.toLocaleString("en-IN")}) × 12`,
      result: annualGross,
    },
    {
      label: "Current Total Deductions",
      formula: `Standard (₹${STANDARD_DEDUCTION}) + 80C (₹${current80C}) + 80D (₹${current80D}) + Home Loan (₹${currentHomeLoan})`,
      result: currentDeductions,
    },
    {
      label: "Current Taxable Income",
      formula: "Annual Gross - Current Deductions",
      result: currentTaxableIncome,
    },
    {
      label: "Current Estimated Tax",
      formula: "Simplified new regime slab calculation + 4% cess",
      result: currentEstimatedTax,
    },
    {
      label: "Projected Total Deductions",
      formula: `Current deductions + additional investments`,
      result: projectedDeductions,
    },
    {
      label: "Projected Taxable Income",
      formula: "Annual Gross - Projected Deductions",
      result: projectedTaxableIncome,
    },
    {
      label: "Projected Estimated Tax",
      formula: "Simplified new regime slab calculation + 4% cess",
      result: projectedEstimatedTax,
    },
    {
      label: "Estimated Tax Savings",
      formula: "Current Tax - Projected Tax",
      result: estimatedSavings,
    },
  ];

  const assumptions = [
    "Uses simplified Indian income tax slabs (illustrative only, not for compliance).",
    "Assumes new tax regime slab rates for demonstration.",
    "Annual gross is estimated as latest monthly gross × 12.",
    "Section 80C limit: ₹1,50,000; Section 80D limit: ₹25,000.",
    "Standard deduction of ₹50,000 applied.",
    "Does not account for HRA exemption, LTA, or other complex exemptions.",
    "Actual tax liability may differ; consult a tax professional.",
  ];

  return {
    currentTaxableIncome,
    projectedTaxableIncome,
    currentEstimatedTax,
    projectedEstimatedTax,
    estimatedSavings,
    steps,
    assumptions,
  };
}
