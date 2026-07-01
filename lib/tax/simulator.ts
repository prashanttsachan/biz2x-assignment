import { getLatestPayslip, getTaxDeclaration } from "@/lib/payroll/queries";
import {
  computeSlabTax,
  estimateAnnualTax,
  estimateHraExemption,
} from "@/lib/tax/calculator";
import {
  HEALTH_EDUCATION_CESS_RATE,
  HOME_LOAN_INTEREST_LIMIT,
  NEW_REGIME_SLABS,
  OLD_REGIME_SLABS,
  SECTION_80C_LIMIT,
  SECTION_80CCD1B_LIMIT,
  SECTION_80D_LIMIT,
  STANDARD_DEDUCTION,
} from "@/lib/tax/constants";
import type {
  CalculationStep,
  DeclarationSnapshot,
  TaxRegimeSnapshot,
  TaxSimulationInput,
  TaxSimulationResult,
} from "@/lib/types";

function buildRegimeSnapshot(
  regime: "old" | "new",
  taxableIncome: number
): TaxRegimeSnapshot {
  const slabs = regime === "old" ? OLD_REGIME_SLABS : NEW_REGIME_SLABS;
  const { taxBeforeCess, slabBreakdown } = computeSlabTax(taxableIncome, slabs);
  const cess = Math.round(taxBeforeCess * HEALTH_EDUCATION_CESS_RATE);
  return {
    regime,
    taxableIncome,
    estimatedTax: taxBeforeCess + cess,
    taxBeforeCess: Math.round(taxBeforeCess),
    cess,
    slabBreakdown,
  };
}

function buildDeclarationSnapshot(
  employeeId: string,
  annualGross: number,
  monthlyBasic: number,
  monthlyHra: number
): DeclarationSnapshot | null {
  const declaration = getTaxDeclaration(employeeId);
  if (!declaration) return null;

  const current80C = Math.min(
    declaration.section80C.declared,
    SECTION_80C_LIMIT
  );
  const current80D = Math.min(
    declaration.section80D.declared,
    SECTION_80D_LIMIT
  );
  const currentHomeLoan = Math.min(
    declaration.homeLoanInterest.declared,
    HOME_LOAN_INTEREST_LIMIT
  );

  const hraExemptionEstimated = declaration.hra.declared
    ? estimateHraExemption({
        annualBasic: monthlyBasic * 12,
        annualHraReceived: monthlyHra * 12,
        annualRentPaid: declaration.hra.rentPaidMonthly * 12,
      })
    : 0;

  return {
    financialYear: declaration.financialYear,
    annualGross,
    section80C: {
      declared: current80C,
      limit: SECTION_80C_LIMIT,
      remaining: SECTION_80C_LIMIT - current80C,
    },
    section80D: {
      declared: current80D,
      limit: SECTION_80D_LIMIT,
      remaining: SECTION_80D_LIMIT - current80D,
    },
    homeLoanInterest: {
      declared: currentHomeLoan,
      limit: HOME_LOAN_INTEREST_LIMIT,
      remaining: HOME_LOAN_INTEREST_LIMIT - currentHomeLoan,
    },
    hraExemptionEstimated,
    ltaDeclared: declaration.lta.declared ? declaration.lta.amount : 0,
  };
}

function computeOldRegimeDeductions(params: {
  current80C: number;
  current80D: number;
  currentNps: number;
  currentHomeLoan: number;
  hraExemption: number;
  additional80C: number;
  additional80D: number;
  additionalNps: number;
  additionalHomeLoan: number;
  includeAdditional: boolean;
}): number {
  const {
    current80C,
    current80D,
    currentNps,
    currentHomeLoan,
    hraExemption,
    additional80C,
    additional80D,
    additionalNps,
    additionalHomeLoan,
    includeAdditional,
  } = params;

  const base =
    STANDARD_DEDUCTION +
    current80C +
    current80D +
    currentNps +
    currentHomeLoan +
    hraExemption;

  if (!includeAdditional) return base;

  return base + additional80C + additional80D + additionalNps + additionalHomeLoan;
}

function buildRecommendations(params: {
  declaration: DeclarationSnapshot | null;
  additional80C: number;
  additional80D: number;
  additionalNps: number;
  estimatedSavings: number;
  regimeComparison: TaxSimulationResult["regimeComparison"];
}): string[] {
  const recs: string[] = [];
  const { declaration, additional80C, additionalNps, estimatedSavings, regimeComparison } =
    params;

  if (declaration) {
    if (declaration.section80C.remaining > 0) {
      recs.push(
        `You have ₹${declaration.section80C.remaining.toLocaleString("en-IN")} remaining under Section 80C — consider ELSS, PPF, or LIC before FY end.`
      );
    }
    if (declaration.section80D.remaining > 0) {
      recs.push(
        `Section 80D has ₹${declaration.section80D.remaining.toLocaleString("en-IN")} headroom for health insurance premiums.`
      );
    }
    if (declaration.hraExemptionEstimated > 0) {
      recs.push(
        `Estimated HRA exemption of ₹${declaration.hraExemptionEstimated.toLocaleString("en-IN")}/year is included (old regime only).`
      );
    }
  }

  if (additional80C > 0 && estimatedSavings > 0) {
    recs.push(
      `Your scenario saves approximately ₹${estimatedSavings.toLocaleString("en-IN")}/year in estimated tax under the old regime.`
    );
  }

  if (regimeComparison) {
    if (regimeComparison.recommended === "new") {
      recs.push(
        `New regime appears lower by ₹${Math.abs(regimeComparison.difference).toLocaleString("en-IN")}/year with current data — review before claiming 80C/80D.`
      );
    } else if (regimeComparison.difference > 0) {
      recs.push(
        `Old regime saves ~₹${regimeComparison.difference.toLocaleString("en-IN")}/year vs new regime with your declarations.`
      );
    }
  }

  if (additionalNps === 0 && declaration) {
    recs.push(
      "Section 80CCD(1B) allows an extra ₹50,000 NPS deduction beyond 80C — not included unless you add it."
    );
  }

  return recs;
}

export function getTaxBaseline(employeeId: string): TaxSimulationResult {
  return simulateTaxSavings(employeeId, {}, { baselineOnly: true });
}

export function simulateTaxSavings(
  employeeId: string,
  input: TaxSimulationInput,
  options?: { baselineOnly?: boolean }
): TaxSimulationResult {
  const regime = input.regime ?? "old";
  const latest = getLatestPayslip(employeeId);
  const declaration = getTaxDeclaration(employeeId);

  const monthlyGross = latest?.earnings.grossPay ?? 90000;
  const monthlyBasic = latest?.earnings.basic ?? Math.round(monthlyGross * 0.55);
  const monthlyHra = latest?.earnings.hra ?? 0;
  const annualGross = monthlyGross * 12;

  const declarationSnapshot = buildDeclarationSnapshot(
    employeeId,
    annualGross,
    monthlyBasic,
    monthlyHra
  );

  const hraExemption = declarationSnapshot?.hraExemptionEstimated ?? 0;

  const current80C = Math.min(
    declaration?.section80C.declared ?? 0,
    SECTION_80C_LIMIT
  );
  const current80D = Math.min(
    declaration?.section80D.declared ?? 0,
    SECTION_80D_LIMIT
  );
  const currentNps = 0;
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
  const additionalNps = Math.min(
    input.additionalNps ?? 0,
    SECTION_80CCD1B_LIMIT - currentNps
  );
  const additionalHomeLoan = Math.min(
    input.homeLoanInterest ?? 0,
    HOME_LOAN_INTEREST_LIMIT - currentHomeLoan
  );

  const baselineOnly = options?.baselineOnly ?? false;
  const hasScenarioInput =
    additional80C > 0 ||
    additional80D > 0 ||
    additionalNps > 0 ||
    additionalHomeLoan > 0;

  const currentOldDeductions = computeOldRegimeDeductions({
    current80C,
    current80D,
    currentNps,
    currentHomeLoan,
    hraExemption,
    additional80C: 0,
    additional80D: 0,
    additionalNps: 0,
    additionalHomeLoan: 0,
    includeAdditional: false,
  });

  const projectedOldDeductions = computeOldRegimeDeductions({
    current80C,
    current80D,
    currentNps,
    currentHomeLoan,
    hraExemption,
    additional80C,
    additional80D,
    additionalNps,
    additionalHomeLoan,
    includeAdditional: true,
  });

  const currentTaxableOld = Math.max(0, annualGross - currentOldDeductions);
  const projectedTaxableOld = Math.max(0, annualGross - projectedOldDeductions);

  const newRegimeDeductions = STANDARD_DEDUCTION;
  const currentTaxableNew = Math.max(0, annualGross - newRegimeDeductions);
  const projectedTaxableNew = currentTaxableNew;

  const useOldForScenario = regime === "old";
  const currentTaxableIncome = useOldForScenario
    ? currentTaxableOld
    : currentTaxableNew;
  const projectedTaxableIncome = useOldForScenario
    ? baselineOnly || !hasScenarioInput
      ? currentTaxableOld
      : projectedTaxableOld
    : projectedTaxableNew;

  const currentSlabs = useOldForScenario ? OLD_REGIME_SLABS : NEW_REGIME_SLABS;
  const currentEstimatedTax = estimateAnnualTax(currentTaxableIncome, currentSlabs);
  const projectedEstimatedTax = estimateAnnualTax(
    projectedTaxableIncome,
    useOldForScenario ? OLD_REGIME_SLABS : NEW_REGIME_SLABS
  );
  const estimatedSavings = baselineOnly
    ? 0
    : currentEstimatedTax - projectedEstimatedTax;

  const { slabBreakdown } = computeSlabTax(currentTaxableIncome, currentSlabs);
  const { slabBreakdown: projectedSlabBreakdown } = computeSlabTax(
    projectedTaxableIncome,
    useOldForScenario ? OLD_REGIME_SLABS : NEW_REGIME_SLABS
  );

  const oldCurrent = buildRegimeSnapshot("old", currentTaxableOld);
  const oldProjected = buildRegimeSnapshot(
    "old",
    baselineOnly || !hasScenarioInput ? currentTaxableOld : projectedTaxableOld
  );
  const newCurrent = buildRegimeSnapshot("new", currentTaxableNew);

  const regimeComparison = {
    old: oldCurrent,
    new: newCurrent,
    recommended:
      oldCurrent.estimatedTax <= newCurrent.estimatedTax
        ? ("old" as const)
        : ("new" as const),
    difference: Math.abs(oldCurrent.estimatedTax - newCurrent.estimatedTax),
    projectedOld: oldProjected,
  };

  const steps: CalculationStep[] = [
    {
      label: "Annual Gross Salary",
      formula: `Monthly gross (₹${monthlyGross.toLocaleString("en-IN")}) × 12`,
      result: annualGross,
    },
  ];

  if (useOldForScenario) {
    steps.push(
      {
        label: "Current Old-Regime Deductions",
        formula: `Standard ₹${STANDARD_DEDUCTION.toLocaleString("en-IN")} + 80C ₹${current80C.toLocaleString("en-IN")} + 80D ₹${current80D.toLocaleString("en-IN")} + HRA ₹${hraExemption.toLocaleString("en-IN")} + Home Loan ₹${currentHomeLoan.toLocaleString("en-IN")}`,
        result: currentOldDeductions,
      },
      {
        label: "Current Taxable Income (Old Regime)",
        formula: "Annual Gross − Current Deductions",
        result: currentTaxableOld,
      }
    );

    if (!baselineOnly && hasScenarioInput) {
      steps.push(
        {
          label: "Additional Investments Applied",
          formula: `80C +₹${additional80C.toLocaleString("en-IN")}, 80D +₹${additional80D.toLocaleString("en-IN")}, NPS +₹${additionalNps.toLocaleString("en-IN")}, Home Loan +₹${additionalHomeLoan.toLocaleString("en-IN")}`,
          result:
            additional80C +
            additional80D +
            additionalNps +
            additionalHomeLoan,
        },
        {
          label: "Projected Old-Regime Deductions",
          formula: "Current deductions + additional investments",
          result: projectedOldDeductions,
        },
        {
          label: "Projected Taxable Income (Old Regime)",
          formula: "Annual Gross − Projected Deductions",
          result: projectedTaxableOld,
        }
      );
    }
  } else {
    steps.push(
      {
        label: "New Regime Taxable Income",
        formula: `Annual Gross − Standard Deduction (₹${STANDARD_DEDUCTION.toLocaleString("en-IN")}). Section 80C/80D not applicable.`,
        result: currentTaxableNew,
      }
    );
  }

  steps.push(
    {
      label: "Current Estimated Tax",
      formula: `${useOldForScenario ? "Old" : "New"} regime slabs + ${HEALTH_EDUCATION_CESS_RATE * 100}% cess`,
      result: currentEstimatedTax,
    }
  );

  if (!baselineOnly && hasScenarioInput) {
    steps.push(
      {
        label: "Projected Estimated Tax",
        formula: `${useOldForScenario ? "Old" : "New"} regime after scenario`,
        result: projectedEstimatedTax,
      },
      {
        label: "Estimated Tax Savings",
        formula: "Current Tax − Projected Tax",
        result: estimatedSavings,
      }
    );
  }

  const assumptions = [
    "Illustrative Indian income tax calculation — not for compliance or filing.",
    regime === "old"
      ? "Old regime includes Section 80C, 80D, HRA exemption, and home loan interest."
      : "New regime uses standard deduction only; 80C/80D/HRA exemptions are not applied.",
    "Annual gross estimated from latest payslip monthly gross × 12.",
    `Section 80C limit ₹${SECTION_80C_LIMIT.toLocaleString("en-IN")}; 80D limit ₹${SECTION_80D_LIMIT.toLocaleString("en-IN")}; 80CCD(1B) NPS limit ₹${SECTION_80CCD1B_LIMIT.toLocaleString("en-IN")}.`,
    "HRA exemption uses minimum of (rent − 10% basic), 50% basic (metro), and HRA received.",
    "Regime comparison shown for current declared position only.",
    "Consult a qualified tax professional before making investment decisions.",
  ];

  const recommendations = buildRecommendations({
    declaration: declarationSnapshot,
    additional80C,
    additional80D,
    additionalNps,
    estimatedSavings,
    regimeComparison,
  });

  return {
    regime,
    baselineOnly,
    annualGross,
    declaration: declarationSnapshot,
    currentTaxableIncome,
    projectedTaxableIncome,
    currentEstimatedTax,
    projectedEstimatedTax,
    estimatedSavings,
    steps,
    slabBreakdown,
    projectedSlabBreakdown,
    regimeComparison,
    recommendations,
    assumptions,
    appliedScenario: baselineOnly
      ? null
      : {
          additional80C,
          additional80D,
          additionalNps,
          additionalHomeLoan,
        },
  };
}
