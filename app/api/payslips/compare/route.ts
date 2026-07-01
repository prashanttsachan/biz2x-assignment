import { logAuditEvent } from "@/lib/audit/logger";
import {
  forbiddenResponse,
  getAuthUser,
  getClientIp,
  unauthorizedResponse,
} from "@/lib/api/helpers";
import { comparePayslips } from "@/lib/payroll/queries";
import { assertEmployeeAccess } from "@/lib/security/access-control";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId") ?? user.employeeId;
  const monthA = searchParams.get("monthA");
  const yearA = searchParams.get("yearA");
  const monthB = searchParams.get("monthB");
  const yearB = searchParams.get("yearB");

  try {
    assertEmployeeAccess(user, employeeId);
  } catch (e) {
    return forbiddenResponse(
      e instanceof Error ? e.message : "Access denied."
    );
  }

  if (!monthA || !yearA || !monthB || !yearB) {
    return Response.json(
      { error: "monthA, yearA, monthB, and yearB are required." },
      { status: 400 }
    );
  }

  const comparison = comparePayslips(
    employeeId,
    monthA,
    parseInt(yearA, 10),
    monthB,
    parseInt(yearB, 10)
  );

  if (!comparison) {
    return Response.json(
      { error: "One or both payslip periods not found." },
      { status: 404 }
    );
  }

  logAuditEvent({
    user,
    action: "payslip_compare",
    resourceType: "payroll",
    details: `Compared ${monthA} ${yearA} vs ${monthB} ${yearB}`,
    ipAddress: getClientIp(request),
  });

  return Response.json({ comparison });
}
