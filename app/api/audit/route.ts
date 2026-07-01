import { auditStore } from "@/lib/data/store";
import {
  forbiddenResponse,
  getAuthUser,
  unauthorizedResponse,
} from "@/lib/api/helpers";
import { canViewAuditLogs } from "@/lib/security/access-control";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  if (canViewAuditLogs(user)) {
    return Response.json({ logs: auditStore.list(limit) });
  }

  if (searchParams.get("scope") === "self") {
    return Response.json({ logs: auditStore.listByUser(user.id, limit) });
  }

  return forbiddenResponse("Audit logs are restricted to admin users.");
}
