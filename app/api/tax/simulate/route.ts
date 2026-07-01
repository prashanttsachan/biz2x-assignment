import { logAuditEvent } from "@/lib/audit/logger";
import {
  badRequestResponse,
  getAuthUser,
  getClientIp,
  unauthorizedResponse,
} from "@/lib/api/helpers";
import { getTaxBaseline, simulateTaxSavings } from "@/lib/tax/simulator";
import type { TaxSimulationInput } from "@/lib/types";
import { NextRequest } from "next/server";

function resolveTargetEmployeeId(
  user: NonNullable<ReturnType<typeof getAuthUser>>,
  employeeId?: string
): string | Response {
  const targetEmployeeId =
    user.role === "admin" && employeeId ? employeeId : user.employeeId;

  if (user.role !== "admin" && targetEmployeeId !== user.employeeId) {
    return Response.json(
      { error: "You can only run simulations for your own account." },
      { status: 403 }
    );
  }

  return targetEmployeeId;
}

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const employeeIdParam = searchParams.get("employeeId") ?? undefined;
  const target = resolveTargetEmployeeId(user, employeeIdParam);
  if (target instanceof Response) return target;

  const baseline = getTaxBaseline(target);

  logAuditEvent({
    user,
    action: "tax_simulation",
    resourceType: "tax",
    resourceId: target,
    details: "Loaded tax baseline",
    ipAddress: getClientIp(request),
  });

  return Response.json({ simulation: baseline });
}

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const body = (await request.json()) as TaxSimulationInput & {
    employeeId?: string;
  };

  const target = resolveTargetEmployeeId(user, body.employeeId);
  if (target instanceof Response) return target;

  const hasInput =
    (body.additional80C ?? 0) > 0 ||
    (body.additional80D ?? 0) > 0 ||
    (body.additionalNps ?? 0) > 0 ||
    (body.homeLoanInterest ?? 0) > 0;

  if (!hasInput) {
    return badRequestResponse(
      "Provide at least one additional investment amount (80C, 80D, NPS, or home loan interest)."
    );
  }

  const result = simulateTaxSavings(target, body);

  logAuditEvent({
    user,
    action: "tax_simulation",
    resourceType: "tax",
    resourceId: target,
    details: `Simulated 80C: ${body.additional80C ?? 0}, 80D: ${body.additional80D ?? 0}, NPS: ${body.additionalNps ?? 0}`,
    ipAddress: getClientIp(request),
  });

  return Response.json({ simulation: result });
}
