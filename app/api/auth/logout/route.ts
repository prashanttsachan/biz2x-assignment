import { destroySession, extractBearerToken } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";
import {
  getAuthUser,
  getClientIp,
  unauthorizedResponse,
} from "@/lib/api/helpers";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const token = extractBearerToken(request.headers.get("authorization"));
  if (token) destroySession(token);

  logAuditEvent({
    user,
    action: "logout",
    resourceType: "session",
    ipAddress: getClientIp(request),
  });

  return Response.json({ success: true });
}
