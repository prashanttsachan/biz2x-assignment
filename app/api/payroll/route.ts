import { logAuditEvent } from "@/lib/audit/logger";
import {
  getAuthUser,
  getClientIp,
  unauthorizedResponse,
} from "@/lib/api/helpers";
import {
  filterPayrollForUser,
  sanitizeAdminPayrollView,
} from "@/lib/security/access-control";
import { getAllPayrollRecords, getStructuredPayroll } from "@/lib/payroll/queries";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");

  if (user.role === "admin") {
    if (employeeId) {
      const records = getStructuredPayroll(employeeId);
      logAuditEvent({
        user,
        action: "admin_view",
        resourceType: "payroll",
        resourceId: employeeId,
        ipAddress: getClientIp(request),
      });
      return Response.json({ records: sanitizeAdminPayrollView(records) });
    }
    const all = getAllPayrollRecords();
    logAuditEvent({
      user,
      action: "admin_view",
      resourceType: "payroll",
      details: "Viewed all employee payroll summary",
      ipAddress: getClientIp(request),
    });
    return Response.json({
      records: sanitizeAdminPayrollView(all),
    });
  }

  const records = filterPayrollForUser(user, getStructuredPayroll(user.employeeId));
  logAuditEvent({
    user,
    action: "payslip_view",
    resourceType: "payroll",
    resourceId: user.employeeId,
    ipAddress: getClientIp(request),
  });

  return Response.json({ records });
}
