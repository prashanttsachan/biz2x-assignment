import { logAuditEvent } from "@/lib/audit/logger";
import {
  forbiddenResponse,
  getAuthUser,
  getClientIp,
  unauthorizedResponse,
} from "@/lib/api/helpers";
import { generateInvestmentChecklist } from "@/lib/tax/checklist";
import { assertEmployeeAccess } from "@/lib/security/access-control";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId") ?? user.employeeId;

  try {
    assertEmployeeAccess(user, employeeId);
  } catch (e) {
    return forbiddenResponse(
      e instanceof Error ? e.message : "Access denied."
    );
  }

  const checklist = generateInvestmentChecklist(employeeId);

  logAuditEvent({
    user,
    action: "checklist_view",
    resourceType: "checklist",
    resourceId: employeeId,
    ipAddress: getClientIp(request),
  });

  return Response.json({ checklist });
}
