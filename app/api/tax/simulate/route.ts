import { logAuditEvent } from "@/lib/audit/logger";
import {
  badRequestResponse,
  getAuthUser,
  getClientIp,
  unauthorizedResponse,
} from "@/lib/api/helpers";
import { simulateTaxSavings } from "@/lib/tax/simulator";
import type { TaxSimulationInput } from "@/lib/types";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const body = (await request.json()) as TaxSimulationInput & {
    employeeId?: string;
  };

  const targetEmployeeId =
    user.role === "admin" && body.employeeId
      ? body.employeeId
      : user.employeeId;

  if (user.role !== "admin" && targetEmployeeId !== user.employeeId) {
    return Response.json(
      { error: "You can only run simulations for your own account." },
      { status: 403 }
    );
  }

  const hasInput =
    (body.additional80C ?? 0) > 0 ||
    (body.additional80D ?? 0) > 0 ||
    (body.homeLoanInterest ?? 0) > 0;

  if (!hasInput) {
    return badRequestResponse(
      "Provide at least one additional investment amount."
    );
  }

  const result = simulateTaxSavings(targetEmployeeId, body);

  logAuditEvent({
    user,
    action: "tax_simulation",
    resourceType: "tax",
    resourceId: targetEmployeeId,
    details: `Simulated additional 80C: ${body.additional80C ?? 0}`,
    ipAddress: getClientIp(request),
  });

  return Response.json({ simulation: result });
}
