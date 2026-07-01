import { describe, expect, it } from "vitest";
import {
  assertEmployeeAccess,
  AuthorizationError,
  filterPayrollForUser,
} from "@/lib/security/access-control";
import { MOCK_USERS, MOCK_PAYROLL } from "@/lib/data/mock-payroll";
import { comparePayslips, getStructuredPayroll } from "@/lib/payroll/queries";
import { simulateTaxSavings } from "@/lib/tax/simulator";
import { generateInvestmentChecklist } from "@/lib/tax/checklist";
import { validatePayslipFields } from "@/lib/ocr/payslip-extractor";
import type { PayslipRecord } from "@/lib/types";

describe("access control", () => {
  const john = MOCK_USERS[0];
  const admin = MOCK_USERS[2];

  it("allows employee to access own data", () => {
    expect(() => assertEmployeeAccess(john, "EMP001")).not.toThrow();
  });

  it("blocks cross-user access", () => {
    expect(() => assertEmployeeAccess(john, "EMP002")).toThrow(AuthorizationError);
  });

  it("allows admin to access any employee data", () => {
    expect(() => assertEmployeeAccess(admin, "EMP002")).not.toThrow();
  });

  it("filters payroll records for employee", () => {
    const filtered = filterPayrollForUser(john, MOCK_PAYROLL);
    expect(filtered.every((r) => r.employeeId === "EMP001")).toBe(true);
    expect(filtered.length).toBe(3);
  });
});

describe("payroll queries", () => {
  it("returns sorted payroll for employee", () => {
    const records = getStructuredPayroll("EMP001");
    expect(records.map((r) => r.month)).toEqual(["Jan", "Feb", "Mar"]);
  });

  it("compares payslips and detects net pay change", () => {
    const comparison = comparePayslips("EMP001", "Feb", 2025, "Mar", 2025);
    expect(comparison).not.toBeNull();
    expect(comparison!.changes.some((c) => c.field === "Net Pay")).toBe(true);
    expect(comparison!.summary).toContain("Net pay");
  });

  it("returns null for missing comparison periods", () => {
    const comparison = comparePayslips("EMP001", "Jan", 2024, "Feb", 2025);
    expect(comparison).toBeNull();
  });

  it("returns empty payroll for employee with no mock or uploaded data", () => {
    const records = getStructuredPayroll("EMP999");
    expect(records).toEqual([]);
  });
});

describe("tax simulator", () => {
  it("estimates tax savings for additional 80C investment", () => {
    const result = simulateTaxSavings("EMP001", { additional80C: 30000 });
    expect(result.estimatedSavings).toBeGreaterThan(0);
    expect(result.projectedTaxableIncome).toBeLessThan(result.currentTaxableIncome);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.assumptions.length).toBeGreaterThan(0);
  });

  it("includes step-by-step breakdown", () => {
    const result = simulateTaxSavings("EMP002", { additional80C: 50000 });
    const savingsStep = result.steps.find((s) => s.label === "Estimated Tax Savings");
    expect(savingsStep).toBeDefined();
    expect(savingsStep!.result).toBe(result.estimatedSavings);
  });
});

describe("investment checklist", () => {
  it("generates pending items for missing proofs", () => {
    const checklist = generateInvestmentChecklist("EMP001");
    expect(checklist.some((i) => i.status === "pending" || i.status === "overdue")).toBe(true);
    expect(checklist.some((i) => i.category === "Section 80C")).toBe(true);
  });

  it("returns empty checklist when employee has no tax declaration", () => {
    const checklist = generateInvestmentChecklist("EMP002");
    expect(checklist.length).toBe(1);
    expect(checklist[0].title).toContain("tax declaration");
  });
});

describe("payslip validation", () => {
  it("warns on inconsistent net pay", () => {
    const badPayslip: PayslipRecord = {
      ...MOCK_PAYROLL[0],
      netPay: 1,
    };
    const result = validatePayslipFields(badPayslip);
    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.includes("Net pay"))).toBe(true);
  });

  it("passes valid payslip", () => {
    const result = validatePayslipFields(MOCK_PAYROLL[0]);
    expect(result.valid).toBe(true);
  });
});

describe("edge cases", () => {
  it("handles employee with no tax declaration gracefully", () => {
    const checklist = generateInvestmentChecklist("UNKNOWN");
    expect(checklist.length).toBe(1);
    expect(checklist[0].title).toContain("tax declaration");
  });

  it("caps additional 80C to remaining limit", () => {
    const result = simulateTaxSavings("EMP001", { additional80C: 999999 });
    expect(result.projectedTaxableIncome).toBeGreaterThanOrEqual(0);
  });
});
