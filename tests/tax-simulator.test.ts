import { describe, expect, it } from "vitest";
import { estimateHraExemption, computeSlabTax } from "@/lib/tax/calculator";
import { OLD_REGIME_SLABS } from "@/lib/tax/constants";
import {
  getTaxBaseline,
  simulateTaxSavings,
} from "@/lib/tax/simulator";

describe("tax calculator", () => {
  it("computes HRA exemption as minimum of three limits", () => {
    const exemption = estimateHraExemption({
      annualBasic: 624000,
      annualHraReceived: 249600,
      annualRentPaid: 216000,
    });
    expect(exemption).toBeGreaterThan(0);
    expect(exemption).toBeLessThanOrEqual(249600);
  });

  it("returns zero HRA exemption when rent is not declared", () => {
    expect(
      estimateHraExemption({
        annualBasic: 624000,
        annualHraReceived: 249600,
        annualRentPaid: 0,
      })
    ).toBe(0);
  });

  it("builds slab breakdown for taxable income", () => {
    const { slabBreakdown, taxBeforeCess } = computeSlabTax(800000, OLD_REGIME_SLABS);
    expect(slabBreakdown.length).toBeGreaterThan(0);
    expect(taxBeforeCess).toBeGreaterThan(0);
  });
});

describe("tax simulator", () => {
  it("estimates tax savings for additional 80C investment", () => {
    const result = simulateTaxSavings("EMP001", { additional80C: 30000 });
    expect(result.estimatedSavings).toBeGreaterThan(0);
    expect(result.projectedTaxableIncome).toBeLessThan(result.currentTaxableIncome);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.slabBreakdown.length).toBeGreaterThan(0);
    expect(result.regimeComparison.old.estimatedTax).toBeDefined();
    expect(result.regimeComparison.new.estimatedTax).toBeDefined();
  });

  it("includes declaration snapshot for EMP001", () => {
    const baseline = getTaxBaseline("EMP001");
    expect(baseline.baselineOnly).toBe(true);
    expect(baseline.declaration?.financialYear).toBe("2024-25");
    expect(baseline.declaration?.section80C.remaining).toBe(30000);
    expect(baseline.declaration?.hraExemptionEstimated).toBeGreaterThan(0);
  });

  it("includes step-by-step breakdown", () => {
    const result = simulateTaxSavings("EMP002", { additional80C: 50000 });
    const savingsStep = result.steps.find((s) => s.label === "Estimated Tax Savings");
    expect(savingsStep).toBeDefined();
    expect(savingsStep!.result).toBe(result.estimatedSavings);
  });

  it("caps additional 80C to remaining limit", () => {
    const result = simulateTaxSavings("EMP001", { additional80C: 999999 });
    expect(result.appliedScenario?.additional80C).toBe(30000);
    expect(result.projectedTaxableIncome).toBeGreaterThanOrEqual(0);
  });

  it("includes NPS 80CCD(1B) in deductions", () => {
    const result = simulateTaxSavings("EMP001", { additionalNps: 50000 });
    expect(result.appliedScenario?.additionalNps).toBe(50000);
    expect(result.estimatedSavings).toBeGreaterThan(0);
  });

  it("compares old vs new regime", () => {
    const baseline = getTaxBaseline("EMP001");
    expect(["old", "new"]).toContain(baseline.regimeComparison.recommended);
    expect(baseline.regimeComparison.difference).toBeGreaterThanOrEqual(0);
  });

  it("generates recommendations", () => {
    const baseline = getTaxBaseline("EMP001");
    expect(baseline.recommendations.length).toBeGreaterThan(0);
  });
});
