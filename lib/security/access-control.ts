import type { PayslipRecord, UploadedPayslip, User } from "@/lib/types";

export class AuthorizationError extends Error {
  constructor(message = "Unauthorized access to resource") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function assertEmployeeAccess(
  user: User,
  targetEmployeeId: string
): void {
  if (user.role === "admin") return;
  if (user.employeeId !== targetEmployeeId) {
    throw new AuthorizationError(
      "You can only access your own payroll and payslip data."
    );
  }
}

export function assertPayslipOwnership(
  user: User,
  payslip: PayslipRecord | UploadedPayslip
): void {
  assertEmployeeAccess(user, payslip.employeeId);
}

export function filterPayrollForUser(
  user: User,
  records: PayslipRecord[]
): PayslipRecord[] {
  if (user.role === "admin") return records;
  return records.filter((r) => r.employeeId === user.employeeId);
}

export function canViewAuditLogs(user: User): boolean {
  return user.role === "admin";
}

export function sanitizeAdminPayrollView(records: PayslipRecord[]) {
  return records.map((r) => ({
    employeeId: r.employeeId,
    month: r.month,
    year: r.year,
    netPay: r.netPay,
    grossPay: r.earnings.grossPay,
    totalDeductions: r.deductions.totalDeductions,
  }));
}
